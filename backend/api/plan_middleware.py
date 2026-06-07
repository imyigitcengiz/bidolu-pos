"""Süresi dolmuş aboneliklerde yazma ve hassas okuma işlemlerini engeller."""

from django.utils.deprecation import MiddlewareMixin
from rest_framework.authtoken.models import Token
from .plan_limits import enforce_brand_write_access, get_plan_status, plan_expired_response

EXEMPT_PATHS = (
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/auth/register-staff/',
    '/api/auth/logout/',
    '/api/auth/me/',
    '/api/auth/seed-super-admin/',
    '/api/auth/plan-status/',
    '/api/auth/payment-providers/',
    '/api/auth/invoices/',
    '/api/franchise/login/',
    '/api/franchise/logout/',
    '/api/payments/stripe/webhook/',
    '/api/payments/stripe/verify/',
    '/api/payments/iyzico/callback/',
)

SENSITIVE_GET_PREFIXES = (
    '/api/report-stats/',
    '/api/low-stock/',
    '/api/customers/',
    '/api/orders/',
    '/api/dashboard-stats/',
    '/api/cash-transactions/',
    '/api/expenses/',
)

WRITE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


def _authenticate_token_user(request):
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        return user
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Token '):
        key = auth_header[6:].strip()
        try:
            token = Token.objects.select_related('user__profile__brand').get(key=key)
            request.user = token.user
            return token.user
        except Token.DoesNotExist:
            pass
    return None


def enforce_sensitive_read_block(request):
    """Süresi dolmuş markada hassas GET endpoint'lerini engeller."""
    user = _authenticate_token_user(request)
    if not user:
        return None
    profile = getattr(user, 'profile', None)
    if not profile or profile.role == 'super_admin':
        return None
    brand = profile.brand
    if not brand:
        return None
    plan_info = get_plan_status(brand)
    if plan_info['can_write']:
        return None
    return plan_expired_response(plan_info)


class PlanEnforcementMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        path = request.path
        if not path.startswith('/api/'):
            return None
        for exempt in EXEMPT_PATHS:
            if path.startswith(exempt):
                return None
        if path.startswith('/api/auth/brands/') and (
            path.endswith('/change-plan/') or path.endswith('/checkout/')
        ):
            return None

        _authenticate_token_user(request)

        if request.method in WRITE_METHODS:
            blocked = enforce_brand_write_access(request)
            if blocked:
                return blocked
            return None

        if request.method == 'GET':
            for prefix in SENSITIVE_GET_PREFIXES:
                if path.startswith(prefix):
                    blocked = enforce_sensitive_read_block(request)
                    if blocked:
                        return blocked
                    break
        return None
