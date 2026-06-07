from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile, Invoice
from api.payment_service import get_active_provider


class PaymentSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_a = User.objects.create_user('pay_a', password='pass1234')
        self.owner_b = User.objects.create_user('pay_b', password='pass1234')
        self.brand_a = Brand.objects.create(name='Pay A', slug='pay-a', owner=self.owner_a, plan='starter')
        self.brand_b = Brand.objects.create(name='Pay B', slug='pay-b', owner=self.owner_b, plan='starter')
        pa, _ = UserProfile.objects.get_or_create(user=self.owner_a)
        pa.role = 'store_owner'
        pa.brand = self.brand_a
        pa.save()
        pb, _ = UserProfile.objects.get_or_create(user=self.owner_b)
        pb.role = 'store_owner'
        pb.brand = self.brand_b
        pb.save()
        self.token_a = Token.objects.create(user=self.owner_a)
        self.invoice_b = Invoice.objects.create(
            brand=self.brand_b, invoice_number='INV-TEST-1', amount=499,
            plan='growth', paid=False, payment_status='pending',
        )

    @override_settings(DEBUG=False)
    def test_mock_disabled_in_production(self):
        with self.assertRaises(RuntimeError):
            get_active_provider()

    def test_checkout_requires_own_brand(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        res = self.client.post(f'/api/auth/brands/{self.brand_b.id}/checkout/', {'plan': 'growth'}, format='json')
        self.assertEqual(res.status_code, 403)
