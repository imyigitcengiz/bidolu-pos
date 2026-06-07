import json

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Brand, Invoice, UserProfile
from .auth_views import _serialize_brand, _serialize_user
from .payment_service import (
    get_active_provider,
    initiate_checkout,
    serialize_invoice,
    verify_iyzico_token,
    verify_stripe_session,
    fulfill_subscription_payment,
)


def _can_checkout(request, brand_id):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role == 'super_admin':
        return profile, Brand.objects.filter(id=brand_id).first(), None
    if profile.role != 'store_owner' or not profile.brand or profile.brand.id != brand_id:
        return None, None, Response({'error': 'Plan ödemesi yalnızca kurum yöneticisine aittir.'}, status=status.HTTP_403_FORBIDDEN)
    return profile, profile.brand, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout_init_view(request, brand_id):
    """Plan ödemesi başlat — Stripe / iyzico yönlendirme veya mock anında tamamlama."""
    profile, brand, err = _can_checkout(request, brand_id)
    if err:
        return err
    if not brand:
        return Response({'error': 'Marka bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    plan = request.data.get('plan')
    if plan not in dict(Brand.PLAN_CHOICES):
        return Response({'error': 'Geçersiz plan seçimi.'}, status=status.HTTP_400_BAD_REQUEST)

    provider = request.data.get('provider') or get_active_provider()
    if provider not in ('mock', 'stripe', 'iyzico'):
        provider = get_active_provider()

    try:
        invoice, checkout_url, active_provider = initiate_checkout(brand, plan, request.user)
    except RuntimeError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    completed = invoice.paid
    return Response({
        'message': 'Ödeme tamamlandı.' if completed else 'Ödeme sayfasına yönlendiriliyorsunuz.',
        'provider': active_provider,
        'completed': completed,
        'checkout_url': checkout_url,
        'invoice': serialize_invoice(invoice),
        'brand': _serialize_brand(brand) if completed else None,
    }, status=status.HTTP_200_OK if completed else status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_providers_view(request):
    """Kullanılabilir ödeme sağlayıcıları."""
    active = get_active_provider()
    providers = []
    if active == 'mock':
        providers.append({
            'id': 'mock',
            'label': 'Test Modu (Geliştirme)',
            'description': 'Gerçek ödeme alınmaz; plan anında aktifleşir.',
        })
    else:
        if active == 'stripe':
            providers.append({'id': 'stripe', 'label': 'Kredi Kartı (Stripe)', 'description': 'Visa, Mastercard, Amex'})
        if active == 'iyzico':
            providers.append({'id': 'iyzico', 'label': 'Kredi Kartı (iyzico)', 'description': 'Türkiye yerel ödeme altyapısı'})
    return Response({'active_provider': active, 'providers': providers})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stripe_verify_view(request):
    """Stripe success redirect sonrası oturum doğrulama."""
    session_id = request.query_params.get('session_id')
    if not session_id:
        return Response({'error': 'session_id gerekli.'}, status=status.HTTP_400_BAD_REQUEST)

    invoice, err = verify_stripe_session(session_id, user=request.user)
    if err:
        return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        'message': 'Ödeme başarıyla tamamlandı.',
        'invoice': serialize_invoice(invoice),
        'brand': _serialize_brand(invoice.brand),
        'user': _serialize_user(request.user, profile),
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def iyzico_callback_view(request):
    """iyzico ödeme sonrası callback — HTML yönlendirme döner."""
    token = request.data.get('token') or getattr(request, 'POST', {}).get('token')
    if not token:
        return Response({'error': 'token gerekli.'}, status=status.HTTP_400_BAD_REQUEST)

    invoice, err = verify_iyzico_token(token)
    frontend = __import__('os').environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')

    if err:
        from urllib.parse import quote
        safe_err = quote(str(err)[:200])
        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
        <meta http-equiv="refresh" content="0;url={frontend}/payment/cancel?provider=iyzico&error={safe_err}">
        </head><body>Yönlendiriliyor...</body></html>"""
        return HttpResponse(html, content_type='text/html')

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url={frontend}/payment/success?provider=iyzico&invoice_id={invoice.id}">
    </head><body>Ödeme başarılı. Yönlendiriliyor...</body></html>"""
    return HttpResponse(html, content_type='text/html')


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook_view(request):
    """Stripe webhook — checkout.session.completed."""
    webhook_secret = __import__('os').environ.get('STRIPE_WEBHOOK_SECRET')
    if not webhook_secret:
        return Response({'error': 'Webhook yapılandırılmamış.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    try:
        import hmac
        import time
        elements = dict(x.split('=', 1) for x in sig_header.split(',') if '=' in x)
        timestamp = elements.get('t', '')
        signature = elements.get('v1', '')
        if not timestamp or not signature:
            return Response({'error': 'Eksik imza bileşeni.'}, status=status.HTTP_400_BAD_REQUEST)
        ts_int = int(timestamp)
        if abs(int(time.time()) - ts_int) > 300:
            return Response({'error': 'Webhook zaman damgası geçersiz.'}, status=status.HTTP_400_BAD_REQUEST)
        signed = f'{timestamp}.{payload.decode("utf-8")}'.encode()
        expected = hmac.new(webhook_secret.encode(), signed, 'sha256').hexdigest()
        if not hmac.compare_digest(expected, signature):
            return Response({'error': 'İmza doğrulanamadı.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response({'error': 'Webhook imza hatası.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        return Response({'error': 'Geçersiz JSON.'}, status=status.HTTP_400_BAD_REQUEST)

    if event.get('type') == 'checkout.session.completed':
        session = event.get('data', {}).get('object', {})
        invoice_id = session.get('metadata', {}).get('invoice_id') or session.get('client_reference_id')
        if invoice_id:
            try:
                invoice = Invoice.objects.select_related('brand').get(id=int(invoice_id))
                fulfill_subscription_payment(invoice)
                invoice.external_id = session.get('id') or invoice.external_id
                invoice.payment_provider = 'stripe'
                invoice.save(update_fields=['external_id', 'payment_provider'])
            except (Invoice.DoesNotExist, ValueError, TypeError):
                pass

    return Response({'received': True})
