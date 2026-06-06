from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import UserProfile, Brand
import uuid


# ─── LOGIN ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
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

    token, _ = Token.objects.get_or_create(user=user)
    profile, _ = UserProfile.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': _serialize_user(user, profile),
    })


# ─── PUBLIC REGISTER (anyone can create account + brand) ─
@api_view(['POST'])
@permission_classes([AllowAny])
def public_register_view(request):
    """Public registration: creates a user, a brand, and links them."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()
    brand_name = request.data.get('brand_name', '').strip()
    plan = request.data.get('plan', 'starter')

    if not username or not password or not brand_name:
        return Response({'error': 'Kullanıcı adı, şifre ve marka adı gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'error': 'Şifre en az 6 karakter olmalıdır.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)

    if plan not in ['starter', 'growth', 'enterprise']:
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

    # Create brand
    brand = Brand.objects.create(
        name=brand_name,
        slug=slug,
        owner=user,
        plan=plan,
    )

    # Link profile to brand as admin
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = 'admin'
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
    
    # Super admin can create anyone; brand admin can create staff for their brand
    if caller_profile.role not in ('super_admin', 'admin'):
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

    # Non-super_admin can only create staff/waiter roles
    if caller_profile.role != 'super_admin' and role in ('super_admin',):
        return Response({'error': 'Bu rolü atama yetkiniz yok.'}, status=status.HTTP_403_FORBIDDEN)

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
        users = User.objects.all().order_by('-date_joined')
    elif caller_profile.role in ('admin', 'manager'):
        # Brand admin sees only their brand's users
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
    if caller_profile.role not in ('super_admin', 'admin'):
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
    total_users = User.objects.count()
    
    plan_dist = {}
    for plan_key, plan_label in Brand.PLAN_CHOICES:
        plan_dist[plan_key] = Brand.objects.filter(plan=plan_key).count()

    recent_brands = Brand.objects.order_by('-created_at')[:5]
    recent_users = User.objects.order_by('-date_joined')[:5]

    return Response({
        'total_brands': total_brands,
        'active_brands': active_brands,
        'total_users': total_users,
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

    # Allow custom credentials
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
def _serialize_user(user, profile):
    brand_data = None
    if profile.brand:
        brand_data = {
            'id': profile.brand.id,
            'name': profile.brand.name,
            'slug': profile.brand.slug,
            'plan': profile.brand.plan,
        }
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
        },
        'member_count': brand.members.count(),
    }
