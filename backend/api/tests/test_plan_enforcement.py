from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile, Category


class PlanEnforcementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user('owner', password='pass1234')
        self.brand = Brand.objects.create(
            name='Expired Brand', slug='expired', owner=self.owner,
            plan='starter', plan_expiry=timezone.localdate() - timedelta(days=10),
            is_active=True,
        )
        p, _ = UserProfile.objects.get_or_create(user=self.owner)
        p.role = 'store_owner'
        p.brand = self.brand
        p.save()
        self.token = Token.objects.create(user=self.owner)

    def test_expired_brand_blocked_on_write(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.post('/api/categories/', {'name': 'New Cat', 'icon': 'x'}, format='json')
        self.assertEqual(res.status_code, 402)

    def test_expired_brand_blocked_on_sensitive_read(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.get('/api/report-stats/')
        self.assertEqual(res.status_code, 402)
