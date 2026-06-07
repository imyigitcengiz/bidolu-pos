from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from api.models import (
    Brand, UserProfile, Branch, Table, Category, MenuItem,
    FranchisePanelToken, Order,
)


class FranchiseOpsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user('fr_owner', password='pass1234')
        self.brand = Brand.objects.create(name='Franchise Co', slug='fr-co', owner=self.owner, plan='growth')
        p, _ = UserProfile.objects.get_or_create(user=self.owner)
        p.role = 'store_owner'
        p.brand = self.brand
        p.save()
        self.branch_a = Branch.objects.create(
            brand=self.brand, name='Şube A', city='İzmir',
            panel_slug='fr-co-sube-a', panel_enabled=True, is_active=True,
        )
        self.branch_a.panel_password = 'hashed'
        self.branch_b = Branch.objects.create(brand=self.brand, name='Şube B', city='Ankara')
        self.table_a = Table.objects.create(brand=self.brand, branch=self.branch_a, name='A1', capacity=4)
        self.table_b = Table.objects.create(brand=self.brand, branch=self.branch_b, name='B1', capacity=4)
        cat = Category.objects.create(brand=self.brand, name='Ana', icon='utensils')
        self.menu_item = MenuItem.objects.create(brand=self.brand, category=cat, name='Çay', price=15)
        self.token = FranchisePanelToken.objects.create(
            branch=self.branch_a, key='test-franchise-token-key',
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.headers = {'HTTP_FRANCHISE_TOKEN': self.token.key}

    def test_create_order_on_own_branch_table(self):
        res = self.client.post(
            '/api/franchise/orders/',
            {'table': self.table_a.id, 'items': [{'menu_item': self.menu_item.id, 'quantity': 2}]},
            format='json',
            **self.headers,
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(float(res.data['total_amount']), 30.0)
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, 'occupied')

    def test_cannot_order_on_other_branch_table(self):
        res = self.client.post(
            '/api/franchise/orders/',
            {'table': self.table_b.id, 'items': [{'menu_item': self.menu_item.id, 'quantity': 1}]},
            format='json',
            **self.headers,
        )
        self.assertEqual(res.status_code, 404)

    def test_change_table_status(self):
        res = self.client.post(
            f'/api/franchise/tables/{self.table_a.id}/change_status/',
            {'status': 'bill_requested'},
            format='json',
            **self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.table_a.refresh_from_db()
        self.assertEqual(self.table_a.status, 'bill_requested')

    def test_menu_endpoint(self):
        res = self.client.get('/api/franchise/menu/', **self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['menu_items']), 1)
