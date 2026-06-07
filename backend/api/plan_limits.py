"""Plan limitleri, deneme süresi ve özellik kapıları."""

from datetime import timedelta
from django.utils import timezone

TRIAL_DAYS = 14
BILLING_CYCLE_DAYS = 30
GRACE_DAYS = 3

PLAN_ORDER = {'starter': 1, 'growth': 2, 'enterprise': 3}

PLAN_LIMITS = {
    'starter': {
        'branches': 1,
        'staff': 5,
        'price': 499.00,
        'label': 'Starter',
    },
    'growth': {
        'branches': 3,
        'staff': 15,
        'price': 999.00,
        'label': 'Growth',
    },
    'enterprise': {
        'branches': 999,
        'staff': 999,
        'price': 1999.00,
        'label': 'Enterprise',
    },
}

FEATURE_MIN_PLAN = {
    'franchise_panel': 'growth',
    'multi_branch': 'growth',
    'qr_menu': 'growth',
    'official_website': 'growth',
    'whatsapp': 'enterprise',
    'crm': 'enterprise',
    'extensions': 'growth',
}


def get_limit(plan, key, default=0):
    return PLAN_LIMITS.get(plan, PLAN_LIMITS['starter']).get(key, default)


def plan_meets_minimum(current_plan, required_plan):
    return PLAN_ORDER.get(current_plan, 1) >= PLAN_ORDER.get(required_plan, 99)


def feature_allowed(plan, feature_key):
    required = FEATURE_MIN_PLAN.get(feature_key)
    if not required:
        return True
    return plan_meets_minimum(plan, required)


def get_brand_usage(brand):
    from .models import Branch, UserProfile
    if not brand:
        return {'branches': 0, 'staff': 0}
    return {
        'branches': Branch.objects.filter(brand=brand).count(),
        'staff': UserProfile.objects.filter(brand=brand).exclude(role='super_admin').count(),
    }


def get_plan_status(brand):
    """Marka abonelik durumu: active | expiring_soon | grace | expired | unlimited."""
    if not brand:
        return {
            'status': 'unlimited',
            'plan_expiry': None,
            'days_remaining': None,
            'grace_days_remaining': None,
            'is_trial': False,
            'can_write': True,
            'message': None,
        }

    today = timezone.localdate()
    expiry = brand.plan_expiry

    if expiry is None:
        return {
            'status': 'unlimited',
            'plan_expiry': None,
            'days_remaining': None,
            'grace_days_remaining': None,
            'is_trial': False,
            'can_write': brand.is_active,
            'message': None,
        }

    days_remaining = (expiry - today).days
    grace_end = expiry + timedelta(days=GRACE_DAYS)
    grace_days_remaining = (grace_end - today).days

    is_trial = False
    if brand.created_at:
        trial_window = (expiry - brand.created_at.date()).days
        is_trial = trial_window <= TRIAL_DAYS + 1

    if days_remaining > 3:
        status = 'active'
        can_write = brand.is_active
        message = None
    elif days_remaining >= 0:
        status = 'expiring_soon'
        can_write = brand.is_active
        message = f'Aboneliğiniz {days_remaining} gün içinde sona erecek.'
    elif grace_days_remaining >= 0:
        status = 'grace'
        can_write = brand.is_active
        message = f'Abonelik süresi doldu. {grace_days_remaining} gün ek süre içindesiniz — planınızı yenileyin.'
    else:
        status = 'expired'
        can_write = False
        message = 'Abonelik süresi doldu. Yazma işlemleri durduruldu — planınızı yenileyin.'

    if not brand.is_active and status != 'expired':
        can_write = False
        message = message or 'Marka hesabı devre dışı.'

    return {
        'status': status,
        'plan_expiry': expiry.isoformat(),
        'days_remaining': max(days_remaining, 0) if days_remaining >= 0 else 0,
        'grace_days_remaining': max(grace_days_remaining, 0) if status in ('grace', 'expired') else None,
        'is_trial': is_trial,
        'can_write': can_write,
        'message': message,
    }


def check_limit(brand, resource_key):
    """Limit aşıldıysa (ok, error_message) döner."""
    if not brand:
        return True, None
    usage = get_brand_usage(brand)
    limit = get_limit(brand.plan, resource_key)
    current = usage.get(resource_key, 0)
    if current >= limit:
        label = PLAN_LIMITS.get(brand.plan, {}).get('label', brand.plan)
        names = {'branches': 'şube/franchise', 'staff': 'ekip üyesi'}
        return False, (
            f'{label} planınız en fazla {limit} {names.get(resource_key, resource_key)} '
            f'oluşturmanıza izin verir. Planınızı yükseltin.'
        )
    return True, None


def check_feature(brand, feature_key):
    if not brand:
        return True, None
    if feature_allowed(brand.plan, feature_key):
        return True, None
    required = FEATURE_MIN_PLAN.get(feature_key, 'growth')
    required_label = PLAN_LIMITS.get(required, {}).get('label', required)
    return False, f'Bu özellik {required_label} planı ve üzeri için kullanılabilir.'


def enforce_brand_write_access(request):
    """Middleware/decorator için — süresi dolmuş markada yazma engeli."""
    user = request.user
    if not user.is_authenticated:
        return None
    profile = getattr(user, 'profile', None)
    if not profile or profile.role == 'super_admin':
        return None
    brand = profile.brand
    if not brand:
        return None
    status_info = get_plan_status(brand)
    if not status_info['can_write']:
        return plan_expired_response(status_info)
    return None


def plan_expired_response(status_info):
    """Middleware process_view için JsonResponse (DRF Response renderer hatası vermez)."""
    from django.http import JsonResponse
    return JsonResponse({
        'error': status_info['message'] or 'Abonelik süresi doldu.',
        'plan_status': status_info,
        'code': 'plan_expired',
    }, status=402)
