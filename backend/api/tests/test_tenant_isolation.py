from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Brand, UserProfile, Table, Category, MenuItem, Ingredient


class TenantIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_a = User.objects.create_user('owner_a', password='pass1234')
        self.owner_b = User.objects.create_user('owner_b', password='pass1234')
        self.brand_a = Brand.objects.create(name='Brand A', slug='brand-a', owner=self.owner_a, plan='starter')
        self.brand_b = Brand.objects.create(name='Brand B', slug='brand-b', owner=self.owner_b, plan='starter')
        pa, _ = UserProfile.objects.get_or_create(user=self.owner_a)
        pa.role = 'store_owner'
        pa.brand = self.brand_a
        pa.save()
        pb, _ = UserProfile.objects.get_or_create(user=self.owner_b)
        pb.role = 'store_owner'
        pb.brand = self.brand_b
        pb.save()
        self.token_a = Token.objects.create(user=self.owner_a)
        self.table_b = Table.objects.create(brand=self.brand_b, name='Masa B1', capacity=4)
        cat_b = Category.objects.create(brand=self.brand_b, name='Cat B', icon='utensils')
        self.menu_b = MenuItem.objects.create(brand=self.brand_b, category=cat_b, name='Item B', price=10)
        Ingredient.objects.create(brand=self.brand_b, name='Un', stock_quantity=1, minimum_stock=5, unit='kg')

    def test_low_stock_scoped_to_brand(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        res = self.client.get('/api/low-stock/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 0)

    def test_cannot_create_order_on_other_brand_table(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        res = self.client.post('/api/orders/', {
            'table': self.table_b.id,
            'items': [{'menu_item': self.menu_b.id, 'quantity': 1}],
        }, format='json')
        self.assertIn(res.status_code, (400, 403))

    def test_report_stats_scoped(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        res = self.client.get('/api/report-stats/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['summary']['order_count'], 0)
