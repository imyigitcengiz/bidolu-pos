import secrets
from django.contrib.auth.hashers import check_password, make_password
from django.utils.text import slugify
from rest_framework import status
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from .models import Branch, Brand, FranchisePanelToken, Order, Payment, Table, User, UserProfile
from .serializers import TableSerializer, OrderSerializer
from .franchise_ops import (
    change_franchise_table_status,
    create_franchise_order,
    franchise_order_for_branch,
    get_franchise_menu,
    pay_and_close_franchise_order,
)
from .throttling import FranchiseLoginRateThrottle

from .plan_limits import check_feature, get_plan_status

FRANCHISE_TOKEN_TTL_DAYS = 7
MIN_PANEL_PASSWORD_LEN = 10


def _get_branch_from_franchise_token(request):
    token_key = request.headers.get('Franchise-Token') or request.headers.get('X-Franchise-Token')
    if not token_key:
        return None, Response({'error': 'Franchise oturum token\'ı gerekli.'}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        token = FranchisePanelToken.objects.select_related('branch', 'branch__brand').get(key=token_key)
    except FranchisePanelToken.DoesNotExist:
        return None, Response({'error': 'Geçersiz veya süresi dolmuş oturum.'}, status=status.HTTP_401_UNAUTHORIZED)
    if token.expires_at and token.expires_at < timezone.now():
        token.delete()
        return None, Response({'error': 'Oturum süresi doldu. Tekrar giriş yapın.'}, status=status.HTTP_401_UNAUTHORIZED)
    branch = token.branch
    if not branch.panel_enabled or not branch.is_active:
        return None, Response({'error': 'Bu franchise paneli devre dışı.'}, status=status.HTTP_403_FORBIDDEN)
    brand = branch.brand
    if brand and not brand.is_active:
        return None, Response({'error': 'Ana şirket aboneliği sona erdi.'}, status=status.HTTP_403_FORBIDDEN)
    if brand:
        plan_info = get_plan_status(brand)
        if not plan_info['can_write']:
            return None, Response({
                'error': plan_info['message'] or 'Ana şirket aboneliği süresi doldu.',
                'code': 'plan_expired',
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
    return branch, None


def _serialize_branch_public(branch):
    brand = branch.brand
    return {
        'id': branch.id,
        'name': branch.name,
        'city': branch.city,
        'address': branch.address,
        'phone': branch.phone,
        'panel_slug': branch.panel_slug,
        'panel_enabled': branch.panel_enabled,
        'has_panel_password': bool(branch.panel_password),
        'is_active': branch.is_active,
        'brand_name': brand.name,
        'brand_plan': brand.plan,
        'brand_plan_display': brand.get_plan_display(),
        'panel_url': f'/franchise?code={branch.panel_slug}' if branch.panel_slug else None,
    }


def _ensure_store_owner(request, branch=None):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role == 'super_admin':
        return profile, None
    if profile.role != 'store_owner':
        return None, Response({'error': 'Franchise oluşturma ve yönetme yalnızca kurum yöneticisine aittir.'}, status=status.HTTP_403_FORBIDDEN)
    if branch and profile.brand_id != branch.brand_id:
        return None, Response({'error': 'Bu şubeyi yönetme yetkiniz yok.'}, status=status.HTTP_403_FORBIDDEN)
    if not profile.brand:
        return None, Response({'error': 'Marka bilgisi bulunamadı.'}, status=status.HTTP_400_BAD_REQUEST)
    return profile, None


def _generate_panel_slug(branch):
    base = slugify(branch.name) or 'sube'
    brand_part = slugify(branch.brand.name)[:20] if branch.brand else 'brand'
    candidate = f"{brand_part}-{base}"[:70]
    suffix = 0
    while Branch.objects.filter(panel_slug=candidate).exclude(pk=branch.pk).exists():
        suffix += 1
        candidate = f"{brand_part}-{base}-{suffix}"[:70]
    return candidate


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([FranchiseLoginRateThrottle])
def franchise_login_view(request):
    """Harici franchise panel girişi — erişim kodu + şifre."""
    access_code = (request.data.get('access_code') or request.data.get('panel_slug') or '').strip().lower()
    password = request.data.get('password') or ''

    if not access_code or not password:
        return Response({'error': 'Erişim kodu ve şifre gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        branch = Branch.objects.select_related('brand').get(panel_slug=access_code)
    except Branch.DoesNotExist:
        return Response({'error': 'Geçersiz erişim kodu.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not branch.panel_enabled or not branch.is_active:
        return Response({'error': 'Bu franchise paneli aktif değil.'}, status=status.HTTP_403_FORBIDDEN)

    if not branch.panel_password or not check_password(password, branch.panel_password):
        return Response({'error': 'Geçersiz şifre.'}, status=status.HTTP_401_UNAUTHORIZED)

    ok, err = check_feature(branch.brand, 'franchise_panel')
    if not ok:
        return Response({'error': err}, status=status.HTTP_403_FORBIDDEN)

    token_key = secrets.token_hex(20)
    FranchisePanelToken.objects.create(
        branch=branch, key=token_key,
        expires_at=timezone.now() + timedelta(days=FRANCHISE_TOKEN_TTL_DAYS),
    )

    return Response({
        'token': token_key,
        'branch': _serialize_branch_public(branch),
        'message': 'Franchise paneline giriş başarılı.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def franchise_logout_view(request):
    token_key = request.headers.get('Franchise-Token') or request.headers.get('X-Franchise-Token')
    if token_key:
        FranchisePanelToken.objects.filter(key=token_key).delete()
    return Response({'message': 'Çıkış yapıldı.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def franchise_dashboard_view(request):
    """Harici panel — şube özeti (ana şirket planı miras alınır)."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err

    brand = branch.brand
    today = timezone.localtime().date()
    orders_qs = Order.objects.filter(brand=brand, branch=branch)
    today_orders = orders_qs.filter(created_at__date=today).count()
    active_orders = orders_qs.filter(status__in=['preparing', 'ready']).count()
    today_revenue = Payment.objects.filter(
        order__brand=brand, order__branch=branch, created_at__date=today,
    ).aggregate(total=Sum('amount'))['total'] or 0
    table_count = Table.objects.filter(brand=brand, branch=branch).count()
    occupied_tables = Table.objects.filter(brand=brand, branch=branch).exclude(status='empty').count()

    return Response({
        'branch': _serialize_branch_public(branch),
        'parent_company': {
            'name': brand.name,
            'plan': brand.plan,
            'plan_display': brand.get_plan_display(),
            'note': 'Franchise paneli ana şirket planı kapsamında çalışır. Ayrı plan tanımlanmaz.',
        },
        'stats': {
            'today_orders': today_orders,
            'active_orders': active_orders,
            'today_revenue': float(today_revenue),
            'table_count': table_count,
            'occupied_tables': occupied_tables,
        },
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def franchise_tables_view(request):
    """Harici panel — yalnızca bu şubenin masaları."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err
    tables = Table.objects.filter(brand=branch.brand, branch=branch).order_by('name')
    return Response(TableSerializer(tables, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def franchise_orders_view(request):
    """Harici panel — şube siparişleri (liste + yeni sipariş)."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err

    if request.method == 'POST':
        table_id = request.data.get('table')
        items_data = request.data.get('items', [])
        order, create_err = create_franchise_order(branch, table_id, items_data)
        if create_err:
            return create_err
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    active_only = request.query_params.get('active')
    orders = Order.objects.filter(brand=branch.brand, branch=branch).select_related('table').order_by('-id')
    if active_only == 'true':
        orders = orders.exclude(status__in=['completed', 'cancelled'])
    return Response(OrderSerializer(orders[:50], many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def franchise_order_detail_view(request, order_id):
    """Harici panel — sipariş detayı."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err
    order, order_err = franchise_order_for_branch(branch, order_id)
    if order_err:
        return order_err
    return Response(OrderSerializer(order).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def franchise_order_pay_view(request, order_id):
    """Harici panel — ödeme al ve masayı kapat."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err
    result, pay_err = pay_and_close_franchise_order(
        branch, order_id,
        request.data.get('payment_method'),
        request.data.get('amount'),
    )
    if pay_err:
        return pay_err
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def franchise_menu_view(request):
    """Harici panel — marka menüsü (şube operasyonları için)."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err
    return Response(get_franchise_menu(branch))


@api_view(['POST'])
@permission_classes([AllowAny])
def franchise_table_status_view(request, table_id):
    """Harici panel — masa durumu güncelle."""
    branch, err = _get_branch_from_franchise_token(request)
    if err:
        return err
    table, status_err = change_franchise_table_status(
        branch, table_id, request.data.get('status'),
    )
    if status_err:
        return status_err
    return Response(TableSerializer(table).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def branch_panel_password_view(request, branch_id):
    """Kurum yöneticisi franchise panel şifresini belirler."""
    try:
        branch = Branch.objects.select_related('brand').get(id=branch_id)
    except Branch.DoesNotExist:
        return Response({'error': 'Şube bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    profile, err = _ensure_store_owner(request, branch)
    if err:
        return err

    ok, err = check_feature(branch.brand, 'franchise_panel')
    if not ok:
        return Response({'error': err}, status=status.HTTP_403_FORBIDDEN)

    password = request.data.get('password', '')
    panel_enabled = request.data.get('panel_enabled', True)

    if password:
        if len(password) < MIN_PANEL_PASSWORD_LEN:
            return Response({
                'error': f'Panel şifresi en az {MIN_PANEL_PASSWORD_LEN} karakter olmalıdır.',
            }, status=status.HTTP_400_BAD_REQUEST)
        branch.panel_password = make_password(password)
        branch.panel_password_updated_at = timezone.now()

    if not branch.panel_slug:
        branch.panel_slug = _generate_panel_slug(branch)

    branch.panel_enabled = bool(panel_enabled)
    branch.save()

    return Response({
        'message': 'Franchise panel erişimi güncellendi.',
        'branch': _serialize_branch_public(branch),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def platform_metrics_view(request):
    """KVKK uyumlu toplu platform metrikleri — kişisel veri içermez."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    role_counts = {}
    for role_key, role_label in UserProfile.ROLE_CHOICES:
        role_counts[role_key] = UserProfile.objects.filter(role=role_key).count()

    return Response({
        'total_user_accounts': User.objects.count(),
        'active_user_accounts': User.objects.filter(is_active=True).count(),
        'inactive_user_accounts': User.objects.filter(is_active=False).count(),
        'accounts_by_role': role_counts,
        'total_brands': Brand.objects.count(),
        'active_brands': Brand.objects.filter(is_active=True).count(),
        'total_branches': Branch.objects.count(),
        'active_franchise_panels': Branch.objects.filter(panel_enabled=True, is_active=True).count(),
        'total_franchise_sessions': FranchisePanelToken.objects.count(),
        'kvkk_notice': (
            'Bu metrikler yalnızca toplu ve anonim sayısal veriler içerir. '
            'KVKK kapsamında bireysel çalışan listesi veya kişisel veri gösterilmez. '
            'Sunucu kapasite planlaması için yeterlidir.'
        ),
        'legal_basis': 'Meşru menfaat / teknik zorunluluk (altyapı yönetimi)',
    })
