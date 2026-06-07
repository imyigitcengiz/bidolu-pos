from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile, Branch, Table


class BranchScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user('branch_owner', password='pass1234')
        self.brand = Brand.objects.create(name='Multi Branch', slug='multi-b', owner=self.owner, plan='growth')
        p, _ = UserProfile.objects.get_or_create(user=self.owner)
        p.role = 'store_owner'
        p.brand = self.brand
        p.save()
        self.token = Token.objects.create(user=self.owner)
        self.branch_a = Branch.objects.create(brand=self.brand, name='Şube A', city='İstanbul')
        self.branch_b = Branch.objects.create(brand=self.brand, name='Şube B', city='Ankara')
        Table.objects.create(brand=self.brand, branch=self.branch_a, name='A1', capacity=4)
        Table.objects.create(brand=self.brand, branch=self.branch_b, name='B1', capacity=4)

    def test_tables_filtered_by_branch_id(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res_all = self.client.get('/api/tables/')
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(len(res_all.data), 2)

        res_a = self.client.get(f'/api/tables/?branch_id={self.branch_a.id}')
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(len(res_a.data), 1)
        self.assertEqual(res_a.data[0]['name'], 'A1')
