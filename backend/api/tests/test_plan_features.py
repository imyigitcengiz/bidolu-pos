from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile


class PlanFeatureGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user('feat_owner', password='pass1234')
        self.brand = Brand.objects.create(name='Starter Brand', slug='starter-f', owner=self.owner, plan='starter')
        p, _ = UserProfile.objects.get_or_create(user=self.owner)
        p.role = 'store_owner'
        p.brand = self.brand
        p.save()
        self.token = Token.objects.create(user=self.owner)

    def test_crm_blocked_on_starter(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.get('/api/customers/')
        self.assertEqual(res.status_code, 403)
