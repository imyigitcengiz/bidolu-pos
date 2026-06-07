from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile


class RoleEscalationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user('owner', password='pass1234')
        self.staff = User.objects.create_user('staff1', password='pass1234')
        self.brand = Brand.objects.create(name='Brand', slug='brand', owner=self.owner, plan='starter')
        po, _ = UserProfile.objects.get_or_create(user=self.owner)
        po.role = 'store_owner'
        po.brand = self.brand
        po.save()
        ps, _ = UserProfile.objects.get_or_create(user=self.staff)
        ps.role = 'waiter'
        ps.brand = self.brand
        ps.save()
        self.token = Token.objects.create(user=self.owner)

    def test_store_owner_cannot_assign_super_admin(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.patch(f'/api/auth/users/{self.staff.id}/', {'role': 'super_admin'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_store_owner_can_assign_waiter(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.patch(f'/api/auth/users/{self.staff.id}/', {'role': 'kitchen'}, format='json')
        self.assertEqual(res.status_code, 200)
        ps = UserProfile.objects.get(user=self.staff)
        self.assertEqual(ps.role, 'kitchen')
