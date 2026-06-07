"""Şube (branch) bazlı veri izolasyonu yardımcıları."""

from .models import Branch, FranchisePanelToken


def get_franchise_branch(request):
    """Franchise-Token header'dan şube döner."""
    token_key = request.headers.get('Franchise-Token') or request.headers.get('X-Franchise-Token')
    if not token_key:
        return None
    try:
        token = FranchisePanelToken.objects.select_related('branch', 'branch__brand').get(key=token_key)
        branch = token.branch
        if branch.panel_enabled and branch.is_active:
            return branch
    except FranchisePanelToken.DoesNotExist:
        pass
    return None


def get_branch_id_from_request(request):
    """Ana panel: ?branch_id= — franchise: token."""
    branch = get_franchise_branch(request)
    if branch:
        return branch.id
    raw = request.query_params.get('branch_id')
    if raw:
        try:
            return int(raw)
        except (TypeError, ValueError):
            return None
    return None


def resolve_branch_for_user(request, branch_id):
    """Kullanıcının markasına ait şubeyi doğrular."""
    if not branch_id or not request.user.is_authenticated:
        return None
    profile = getattr(request.user, 'profile', None)
    if not profile or not profile.brand_id:
        return None
    if profile.role == 'super_admin':
        return Branch.objects.filter(id=branch_id).first()
    return Branch.objects.filter(id=branch_id, brand_id=profile.brand_id).first()


def filter_by_tenant(queryset, request, brand_field='brand', branch_field='branch'):
    """Marka + isteğe bağlı şube filtresi."""
    user = request.user
    if not user.is_authenticated:
        return queryset.none()

    profile = getattr(user, 'profile', None)
    if profile and profile.role != 'super_admin':
        if profile.brand:
            queryset = queryset.filter(**{brand_field: profile.brand})
        else:
            return queryset.model.objects.none()

    branch_id = get_branch_id_from_request(request)
    if branch_id and not get_franchise_branch(request):
        branch = resolve_branch_for_user(request, branch_id)
        if branch:
            queryset = queryset.filter(**{branch_field: branch_id})
        elif profile and profile.role != 'super_admin':
            return queryset.model.objects.none()

    return queryset


def branch_order_filter(branch):
    """Sipariş queryset'i — şube + şubesiz (legacy) masalar."""
    from django.db.models import Q
    return Q(branch=branch) | Q(branch__isnull=True, table__branch=branch)
