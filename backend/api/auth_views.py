from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import status
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import UserProfile, Brand, Invoice, Branch, FranchisePanelToken, AuditLog
from .throttling import LoginRateThrottle, RegisterRateThrottle
from .plan_limits import (
    TRIAL_DAYS, BILLING_CYCLE_DAYS, PLAN_LIMITS, get_plan_status,
    get_brand_usage, check_limit,
)
from .tenant_helpers import validate_role_assignment
import uuid
from django.utils import timezone
from datetime import timedelta


# ─── LOGIN ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response({'error': 'Kullanıcı adı ve şifre gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if user is None:
        return Response({'error': 'Geçersiz kullanıcı adı veya şifre.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'error': 'Bu hesap devre dışı bırakılmış.'}, status=status.HTTP_403_FORBIDDEN)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.role != 'super_admin' and profile.brand and not profile.brand.is_active:
        return Response({
            'error': 'Marka hesabı devre dışı. Destek ile iletişime geçin veya planınızı yenileyin.',
            'code': 'brand_inactive',
        }, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': _serialize_user(user, profile),
    })


# ─── PUBLIC REGISTER (anyone can create account + brand) ─
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def public_register_view(request):
    """Public registration: creates a user, a brand, and links them."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()
    brand_name = request.data.get('brand_name', '').strip()
    if not username or not password or not brand_name:
        return Response({'error': 'Kullanıcı adı, şifre ve marka adı gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'error': 'Şifre en az 6 karakter olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)

    plan = 'starter'

    # Generate unique slug
    base_slug = slugify(brand_name) or 'brand'
    slug = base_slug
    counter = 1
    while Brand.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create user
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )

    trial_end = timezone.localdate() + timedelta(days=TRIAL_DAYS)

    brand = Brand.objects.create(
        name=brand_name,
        slug=slug,
        owner=user,
        plan=plan,
        plan_expiry=trial_end,
        is_active=True,
    )

    # Link profile to brand as store_owner
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = 'store_owner'
    profile.brand = brand
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': _serialize_user(user, profile),
        'brand': _serialize_brand(brand),
    }, status=status.HTTP_201_CREATED)


# ─── ADMIN REGISTER (super_admin or brand admin creates staff) ─
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    
    # Super admin can create anyone; brand owner can create staff for their brand
    if caller_profile.role not in ('super_admin', 'store_owner'):
        return Response({'error': 'Yalnızca yöneticiler yeni kullanıcı oluşturabilir.'}, status=status.HTTP_403_FORBIDDEN)

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    role = request.data.get('role', 'staff')
    phone = request.data.get('phone', '').strip()

    if not username or not password:
        return Response({'error': 'Kullanıcı adı ve şifre gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)

    if caller_profile.role == 'store_owner' and caller_profile.brand:
        ok, err = check_limit(caller_profile.brand, 'staff')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

    ok, role_err = validate_role_assignment(caller_profile.role, role)
    if not ok:
        return Response({'error': role_err}, status=status.HTTP_403_FORBIDDEN)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.phone = phone
    # Assign to caller's brand (unless super_admin specifying different)
    if caller_profile.role == 'super_admin':
        brand_id = request.data.get('brand_id')
        if brand_id:
            try:
                profile.brand = Brand.objects.get(id=brand_id)
            except Brand.DoesNotExist:
                pass
    else:
        profile.brand = caller_profile.brand
    profile.save()

    return Response({
        'user': _serialize_user(user, profile),
    }, status=status.HTTP_201_CREATED)


# ─── LOGOUT ────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Başarıyla çıkış yapıldı.'})


# ─── ME (get/update profile) ──────────────────────────
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response({'user': _serialize_user(user, profile)})

    # PATCH — update profile
    data = request.data

    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        user.email = data['email']

    # Password change
    if 'new_password' in data and data['new_password']:
        old_password = data.get('old_password', '')
        if not user.check_password(old_password):
            return Response({'error': 'Mevcut şifre yanlış.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(data['new_password'])

    user.save()

    if 'phone' in data:
        profile.phone = data['phone']
    if 'role' in data:
        caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if caller_profile.role == 'super_admin':
            profile.role = data['role']

    if 'avatar' in request.FILES:
        profile.avatar = request.FILES['avatar']

    profile.save()

    return Response({'user': _serialize_user(user, profile)})


# ─── USER LIST (super admin or brand admin) ───────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    
    if caller_profile.role == 'super_admin':
        # MVP: sistem yöneticisi yalnızca mağaza sahiplerini görür
        users = User.objects.filter(profile__role='store_owner').order_by('-date_joined')
    elif caller_profile.role in ('store_owner', 'manager'):
        # Brand owner sees only their brand's users
        users = User.objects.filter(profile__brand=caller_profile.brand).order_by('-date_joined')
    else:
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    result = []
    for u in users:
        profile, _ = UserProfile.objects.get_or_create(user=u)
        result.append(_serialize_user(u, profile))

    return Response(result)


# ─── USER DETAIL (super admin or brand admin: edit/delete) ─
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail_view(request, user_id):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role not in ('super_admin', 'store_owner'):
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Kullanıcı bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    # Brand admin can only manage users in their brand
    if caller_profile.role != 'super_admin':
        target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
        if target_profile.brand != caller_profile.brand:
            return Response({'error': 'Bu kullanıcıyı yönetme yetkiniz yok.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        if target_user.id == request.user.id:
            return Response({'error': 'Kendinizi silemezsiniz.'}, status=status.HTTP_400_BAD_REQUEST)
        target_user.delete()
        return Response({'message': 'Kullanıcı silindi.'})

    # PATCH
    data = request.data
    profile, _ = UserProfile.objects.get_or_create(user=target_user)

    if 'first_name' in data:
        target_user.first_name = data['first_name']
    if 'last_name' in data:
        target_user.last_name = data['last_name']
    if 'email' in data:
        target_user.email = data['email']
    if 'is_active' in data:
        target_user.is_active = data['is_active']
    if 'password' in data and data['password']:
        target_user.set_password(data['password'])

    target_user.save()

    if 'role' in data:
        ok, role_err = validate_role_assignment(caller_profile.role, data['role'])
        if not ok:
            return Response({'error': role_err}, status=status.HTTP_403_FORBIDDEN)
        profile.role = data['role']
    if 'phone' in data:
        profile.phone = data['phone']
    profile.save()

    return Response({'user': _serialize_user(target_user, profile)})


# ─── IMPERSONATE (super_admin logs in as any user) ────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def impersonate_view(request, user_id):
    """Super admin can get a token for any user to impersonate them."""
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yalnızca Süper Yönetici bu işlemi yapabilir.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Kullanıcı bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
    if target_profile.role != 'store_owner':
        return Response(
            {'error': 'Yalnızca mağaza sahipleri olarak giriş yapılabilir.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=target_user)

    return Response({
        'token': token.key,
        'user': _serialize_user(target_user, target_profile),
        'impersonated': True,
    })


# ─── BRAND CRUD (super_admin) ─────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def brand_list_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    brands = Brand.objects.all().order_by('-created_at')
    result = [_serialize_brand(b) for b in brands]
    return Response(result)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def brand_detail_view(request, brand_id):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response({'error': 'Marka bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        brand.delete()
        return Response({'message': 'Marka silindi.'})

    # PATCH
    data = request.data
    if 'name' in data:
        brand.name = data['name']
    if 'plan' in data and data['plan'] in dict(Brand.PLAN_CHOICES):
        brand.plan = data['plan']
    if 'is_active' in data:
        brand.is_active = data['is_active']
    if 'plan_expiry' in data:
        brand.plan_expiry = data['plan_expiry'] or None

    if 'owner_id' in data and data['owner_id']:
        try:
            new_owner = User.objects.get(id=data['owner_id'])
        except User.DoesNotExist:
            return Response({'error': 'Yeni sahip kullanıcısı bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)
        new_profile, _ = UserProfile.objects.get_or_create(user=new_owner)
        new_profile.role = 'store_owner'
        new_profile.brand = brand
        new_profile.save()
        brand.owner = new_owner

    if 'new_owner' in data and isinstance(data['new_owner'], dict):
        no = data['new_owner']
        username = (no.get('username') or '').strip()
        password = no.get('password') or ''
        if not username or not password:
            return Response({'error': 'Yeni sahip için kullanıcı adı ve şifre zorunludur.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)
        new_owner = User.objects.create_user(
            username=username,
            password=password,
            email=(no.get('email') or '').strip(),
            first_name=(no.get('first_name') or '').strip(),
            last_name=(no.get('last_name') or '').strip(),
        )
        new_profile, _ = UserProfile.objects.get_or_create(user=new_owner)
        new_profile.role = 'store_owner'
        new_profile.brand = brand
        new_profile.phone = (no.get('phone') or '').strip() or None
        new_profile.save()
        brand.owner = new_owner

    brand.save()

    return Response({'brand': _serialize_brand(brand)})


# ─── SUPER ADMIN STATS ────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def super_admin_stats_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    total_brands = Brand.objects.count()
    active_brands = Brand.objects.filter(is_active=True).count()
    total_users = User.objects.filter(profile__role='store_owner').count()
    total_accounts = User.objects.count()
    active_accounts = User.objects.filter(is_active=True).count()

    plan_dist = {}
    for plan_key, plan_label in Brand.PLAN_CHOICES:
        plan_dist[plan_key] = Brand.objects.filter(plan=plan_key).count()

    recent_brands = Brand.objects.order_by('-created_at')[:5]
    recent_users = User.objects.filter(profile__role='store_owner').order_by('-date_joined')[:5]

    role_counts = {}
    for role_key, _ in UserProfile.ROLE_CHOICES:
        role_counts[role_key] = UserProfile.objects.filter(role=role_key).count()

    return Response({
        'total_brands': total_brands,
        'active_brands': active_brands,
        'total_users': total_users,
        'total_store_owners': total_users,
        'platform_metrics': {
            'total_user_accounts': total_accounts,
            'active_user_accounts': active_accounts,
            'accounts_by_role': role_counts,
            'total_branches': Branch.objects.count(),
            'active_franchise_panels': Branch.objects.filter(panel_enabled=True, is_active=True).count(),
            'kvkk_notice': (
                'Toplam hesap sayıları yalnızca altyapı planlaması içindir. '
                'KVKK gereği bireysel çalışan verisi gösterilmez.'
            ),
        },
        'plan_distribution': plan_dist,
        'recent_brands': [_serialize_brand(b) for b in recent_brands],
        'recent_users': [_serialize_user(u, UserProfile.objects.get_or_create(user=u)[0]) for u in recent_users],
    })


# ─── SEED SUPER ADMIN ─────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def seed_super_admin(request):
    """Create default super admin if no users exist."""
    if User.objects.exists():
        return Response({'error': 'Sistemde zaten kullanıcılar mevcut. Güvenlik gereği seed işlemi yapılamaz.'}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.DEBUG:
        secret = getattr(settings, 'SEED_ADMIN_SECRET', '')
        provided = request.headers.get('X-Seed-Admin-Secret', '')
        if not secret or provided != secret:
            return Response({'error': 'Seed işlemi devre dışı.'}, status=status.HTTP_403_FORBIDDEN)

    username = request.data.get('username', 'admin')
    password = request.data.get('password', 'admin123')

    user = User.objects.create_superuser(
        username=username,
        password=password,
        email='admin@bidolupos.com',
        first_name='Süper',
        last_name='Yönetici',
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = 'super_admin'
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'message': 'Süper yönetici oluşturuldu. Lütfen şifrenizi değiştirin.',
        'token': token.key,
        'user': _serialize_user(user, profile),
    }, status=status.HTTP_201_CREATED)


# ─── HELPERS ───────────────────────────────────────────
def _serialize_brand_brief(brand):
    if not brand:
        return None
    limits = PLAN_LIMITS.get(brand.plan, PLAN_LIMITS['starter'])
    return {
        'id': brand.id,
        'name': brand.name,
        'slug': brand.slug,
        'plan': brand.plan,
        'plan_display': brand.get_plan_display(),
        'plan_expiry': brand.plan_expiry.isoformat() if brand.plan_expiry else None,
        'is_active': brand.is_active,
        'plan_status': get_plan_status(brand),
        'limits': {
            'branches': limits['branches'],
            'staff': limits['staff'],
        },
        'usage': get_brand_usage(brand),
    }


def _serialize_user(user, profile):
    brand_data = _serialize_brand_brief(profile.brand) if profile.brand else None
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_active': user.is_active,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined.isoformat(),
        'role': profile.role,
        'role_display': profile.get_role_display(),
        'phone': profile.phone or '',
        'avatar': profile.avatar.url if profile.avatar else None,
        'brand': brand_data,
    }


def _serialize_brand(brand):
    return {
        'id': brand.id,
        'name': brand.name,
        'slug': brand.slug,
        'plan': brand.plan,
        'plan_display': brand.get_plan_display(),
        'is_active': brand.is_active,
        'plan_expiry': brand.plan_expiry.isoformat() if brand.plan_expiry else None,
        'created_at': brand.created_at.isoformat(),
        'owner': {
            'id': brand.owner.id,
            'username': brand.owner.username,
            'email': brand.owner.email,
            'first_name': brand.owner.first_name,
            'last_name': brand.owner.last_name,
        } if brand.owner else None,
        'member_count': brand.members.count(),
    }


def _impersonate_store_owner(request, target_user):
    """Shared helper: super admin enters a store as its owner."""
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yalnızca Süper Yönetici bu işlemi yapabilir.'}, status=status.HTTP_403_FORBIDDEN)

    target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
    if target_profile.role != 'store_owner':
        return Response({'error': 'Yalnızca mağaza sahipleri olarak giriş yapılabilir.'}, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=target_user)
    AuditLog.objects.create(
        actor=request.user,
        target_user=target_user,
        action='impersonate',
        metadata={'target_role': target_profile.role, 'target_brand_id': target_profile.brand_id},
    )
    return Response({
        'token': token.key,
        'user': _serialize_user(target_user, target_profile),
        'impersonated': True,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def brand_enter_view(request, brand_id):
    """Super admin enters a brand's store panel as the brand owner."""
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response({'error': 'Marka bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    if not brand.owner:
        return Response({'error': 'Bu markanın tanımlı bir sahibi yok. Önce mağaza sahibi atayın.'}, status=status.HTTP_400_BAD_REQUEST)

    return _impersonate_store_owner(request, brand.owner)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_view(request, brand_id):
    """Süper yönetici manuel plan ataması — ödeme gerektirmez."""
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({
            'error': 'Plan değişikliği için ödeme akışını kullanın.',
            'code': 'use_checkout',
            'checkout_url': f'/api/auth/brands/{brand_id}/checkout/',
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        brand = Brand.objects.get(id=brand_id)
    except Brand.DoesNotExist:
        return Response({'error': 'Marka bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    new_plan = request.data.get('plan')
    if new_plan not in dict(Brand.PLAN_CHOICES):
        return Response({'error': 'Geçersiz plan seçimi.'}, status=status.HTTP_400_BAD_REQUEST)

    from .payment_service import create_pending_invoice, fulfill_subscription_payment, serialize_invoice
    invoice = create_pending_invoice(brand, new_plan)
    invoice.payment_provider = 'mock'
    invoice.save(update_fields=['payment_provider'])
    fulfill_subscription_payment(invoice)

    return Response({
        'message': 'Plan başarıyla güncellendi (yönetici ataması).',
        'brand': _serialize_brand(brand),
        'invoice': serialize_invoice(invoice),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plan_status_view(request):
    """Marka plan durumu, limitler ve kullanım."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role == 'super_admin':
        return Response({'role': 'super_admin', 'unlimited': True})
    if not profile.brand:
        return Response({'error': 'Marka bulunamadı.'}, status=status.HTTP_400_BAD_REQUEST)
    brand = profile.brand
    limits = PLAN_LIMITS.get(brand.plan, PLAN_LIMITS['starter'])
    return Response({
        'brand_id': brand.id,
        'brand_name': brand.name,
        'plan': brand.plan,
        'plan_display': brand.get_plan_display(),
        'plan_status': get_plan_status(brand),
        'limits': limits,
        'usage': get_brand_usage(brand),
        'trial_days': TRIAL_DAYS,
        'all_plans': {
            key: {'label': val['label'], 'branches': val['branches'], 'staff': val['staff'], 'price': val['price']}
            for key, val in PLAN_LIMITS.items()
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_list_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role == 'super_admin':
        invoices = Invoice.objects.all().order_by('-created_at')
    else:
        if caller_profile.brand:
            invoices = Invoice.objects.filter(brand=caller_profile.brand).order_by('-created_at')
        else:
            invoices = Invoice.objects.none()

    from .payment_service import serialize_invoice
    result = []
    for inv in invoices:
        row = serialize_invoice(inv)
        row['brand_name'] = inv.brand.name
        result.append(row)
    return Response(result)

