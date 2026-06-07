from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from api.models import (
    Table, Category, MenuItem, Order, OrderItem, Payment,
    OrderChannel, CashRegister, Ingredient, Recipe, RecipeIngredient,
    StaffMember, Expense, Courier, CourierLog, RestaurantProfile,
    Customer, WhatsAppConfig, Brand, UserProfile, Branch
)
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds initial mock data for the restaurant POS application including extended modules.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # 1. Clear existing data
        Branch.objects.all().delete()
        Brand.objects.all().delete()
        CourierLog.objects.all().delete()
        Courier.objects.all().delete()
        Expense.objects.all().delete()
        Customer.objects.all().delete()
        WhatsAppConfig.objects.all().delete()
        StaffMember.objects.all().delete()
        RecipeIngredient.objects.all().delete()
        Recipe.objects.all().delete()
        Ingredient.objects.all().delete()
        RestaurantProfile.objects.all().delete()
        CashRegister.objects.all().delete()
        OrderChannel.objects.all().delete()
        Payment.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        Table.objects.all().delete()
        
        self.stdout.write('Existing data cleared.')

        # 2. Create Brand, Profiles & Staff (created first to link all multi-tenant models)
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user, _ = User.objects.get_or_create(username='im.yigit', email='yigit@bidolupos.com')
            admin_user.set_password('Yigoc3535-*')
            admin_user.is_superuser = True
            admin_user.is_staff = True
            admin_user.save()

        brand = Brand.objects.create(
            name="Bidolu Kebap ve Lahmacun Grubu",
            slug="bidolu-kebap-grubu",
            owner=admin_user,
            plan="enterprise",
            plan_expiry=timezone.now().date() + timedelta(days=365),
            is_active=True
        )

        admin_profile, _ = UserProfile.objects.get_or_create(user=admin_user)
        admin_profile.brand = brand
        admin_profile.role = 'super_admin'
        admin_profile.save()

        staff1 = StaffMember.objects.create(user=admin_user, role='admin', hire_date=timezone.now().date() - timedelta(days=30))
        
        garson_user, _ = User.objects.get_or_create(username='garson1', email='garson1@bidolupos.com')
        garson_user.set_password('Yigoc3535-*')
        garson_user.save()

        garson_profile, _ = UserProfile.objects.get_or_create(user=garson_user)
        garson_profile.brand = brand
        garson_profile.role = 'staff'
        garson_profile.save()

        staff2 = StaffMember.objects.create(user=garson_user, role='staff', hire_date=timezone.now().date() - timedelta(days=15))

        self.stdout.write('Brand, profiles, and staff seeded.')

        # 3. Create Branches (before tables — şube bazlı izolasyon)
        branch_alsancak = Branch.objects.create(
            brand=brand, name="Alsancak Merkez Şubesi", city="İzmir",
            address="Alsancak, Konak, İzmir", phone="0232 444 55 66", is_active=True,
        )
        branch_bostanli = Branch.objects.create(
            brand=brand, name="Bostanlı Şubesi", city="İzmir",
            address="Bostanlı, Karşıyaka, İzmir", phone="0232 333 44 55", is_active=True,
        )
        branch_bornova = Branch.objects.create(
            brand=brand, name="Bornova Şubesi", city="İzmir",
            address="Bornova Merkez, Bornova, İzmir", phone="0232 222 33 44", is_active=False,
        )
        branches = [branch_alsancak, branch_bostanli]

        # 4. Create Tables (her aktif şube için ayrı masa seti)
        tables_data = [
            {'name': 'Masa 1', 'capacity': 4},
            {'name': 'Masa 2', 'capacity': 2},
            {'name': 'Masa 3', 'capacity': 6},
            {'name': 'Masa 4', 'capacity': 4},
            {'name': 'Bahçe 1', 'capacity': 4},
            {'name': 'Bahçe 2', 'capacity': 8},
            {'name': 'VIP Salon', 'capacity': 10},
            {'name': 'WebSitesi Paket', 'capacity': 1},
            {'name': 'Yemeksepeti Paket', 'capacity': 1},
            {'name': 'Getir Paket', 'capacity': 1},
            {'name': 'Trendyol Paket', 'capacity': 1},
            {'name': 'Migros Paket', 'capacity': 1},
        ]
        tables = []
        tables_dict = {}
        for branch in branches:
            for t in tables_data:
                table = Table.objects.create(
                    brand=brand, branch=branch, name=t['name'],
                    capacity=t['capacity'], status='empty',
                )
                tables.append(table)
                tables_dict[f"{branch.id}:{t['name']}"] = table

        self.stdout.write(f'{len(tables)} tables created across {len(branches)} branches.')

        # 5. Create Categories
        categories_data = [
            {'name': 'Çorbalar', 'icon': 'soup'},
            {'name': 'Ana Yemekler', 'icon': 'utensils'},
            {'name': 'Salatalar', 'icon': 'salad'},
            {'name': 'Tatlılar', 'icon': 'cake'},
            {'name': 'İçecekler', 'icon': 'cup-soda'},
        ]
        categories = {}
        for c in categories_data:
            cat = Category.objects.create(brand=brand, name=c['name'], icon=c['icon'])
            categories[c['name']] = cat
            
        self.stdout.write(f'{len(categories)} categories created.')

        # 6. Create Menu Items
        menu_items_data = [
            {'category': 'Çorbalar', 'name': 'Mercimek Çorbası', 'price': 65.00, 'description': 'Limon ve kruton ile servis edilir.'},
            {'category': 'Çorbalar', 'name': 'Ezogelin Çorbası', 'price': 70.00, 'description': 'Geleneksel lezzet.'},
            {'category': 'Ana Yemekler', 'name': 'Adana Kebap', 'price': 280.00, 'description': 'Közlenmiş biber, domates ve lavaş ile.'},
            {'category': 'Ana Yemekler', 'name': 'Tavuk Şiş', 'price': 220.00, 'description': 'Bulgur pilavı ve yeşillik ile.'},
            {'category': 'Ana Yemekler', 'name': 'Mantı', 'price': 190.00, 'description': 'Tereyağlı sos ve yoğurt eşliğinde.'},
            {'category': 'Ana Yemekler', 'name': 'Köfte Izgara', 'price': 240.00, 'description': 'Patates kızartması ve pilav ile.'},
            {'category': 'Salatalar', 'name': 'Mevsim Salatası', 'price': 90.00, 'description': 'Taze mevsim yeşillikleri.'},
            {'category': 'Salatalar', 'name': 'Çoban Salatası', 'price': 95.00, 'description': 'Domates, salatalık, biber, zeytinyağı.'},
            {'category': 'Tatlılar', 'name': 'Künefe', 'price': 150.00, 'description': 'Antep fıstıklı sıcak şerbetli tatlı.'},
            {'category': 'Tatlılar', 'name': 'Fırın Sütlaç', 'price': 110.00, 'description': 'Geleneksel fırınlanmış sütlaç.'},
            {'category': 'Tatlılar', 'name': 'Baklava', 'price': 160.00, 'description': 'Fıstıklı ev baklavası (3 dilim).'},
            {'category': 'İçecekler', 'name': 'Ayran', 'price': 35.00, 'description': 'Yayık ayranı.'},
            {'category': 'İçecekler', 'name': 'Kola', 'price': 50.00, 'description': 'Kutu kola.'},
            {'category': 'İçecekler', 'name': 'Şalgam Suyu', 'price': 40.00, 'description': 'Acılı veya acısız seçenekleriyle.'},
            {'category': 'İçecekler', 'name': 'Su', 'price': 15.00, 'description': '0.5L pet şişe.'},
        ]
        menu_items = []
        menu_items_dict = {}
        for item in menu_items_data:
            mi = MenuItem.objects.create(
                brand=brand,
                category=categories[item['category']],
                name=item['name'],
                price=item['price'],
                description=item['description'],
                is_available=True
            )
            menu_items.append(mi)
            menu_items_dict[item['name']] = mi
            
        self.stdout.write(f'{len(menu_items)} menu items created.')

        # 7. Seed Order Channels
        channels_data = [
            {'name': 'WebSitesi', 'api_key': 'web-secret-key-123'},
            {'name': 'Yemeksepeti', 'api_key': 'ys-secret-key-456'},
            {'name': 'Getir', 'api_key': 'getir-secret-key-789'},
            {'name': 'Trendyol Yemek', 'api_key': 'ty-secret-key-101'},
            {'name': 'Migros Yemek', 'api_key': 'migros-secret-key-202'},
        ]
        for ch in channels_data:
            OrderChannel.objects.create(name=ch['name'], api_key=ch['api_key'], endpoint_url='https://api.bidolupos.com/webhook')

        # 8. Seed Cash Registers (şube bazlı)
        cash_registers = {}
        for branch in branches:
            reg = CashRegister.objects.create(
                brand=brand, branch=branch, name=f'{branch.name} Kasası',
                balance=4250.00, location=branch.name,
            )
            cash_registers[branch.id] = reg

        # 9. Seed Restaurant Profile
        RestaurantProfile.objects.create(
            brand=brand,
            name='Bidolu Kebap & Lahmacun',
            phone='0232 444 55 66',
            address='Alsancak Mah. Kıbrıs Şehitleri Cad. No:35 Konak / İzmir',
            tax_office='Kordon Vergi Dairesi',
            tax_number='3535061909',
            working_hours='10:00 - 23:00',
            active_plan='Growth',
            plan_expiry=timezone.now().date() + timedelta(days=365),
            website_slug='bidolu-kebap',
            website_theme_color='#6366f1',
            website_banner_text='En Lezzetli Kebaplar ve Lahmacunlar Bidolu\'da!',
            website_enable_table_orders=True,
            website_enable_delivery=True,
            website_enable_takeaway=True,
            website_custom_domain='www.bidolukebap.com',
            website_about_text='1990 yılından beri İzmir Alsancak\'ta geleneksel odun ateşinde kebap ve taş fırında lahmacun lezzetini sunuyoruz. Tamamen taze malzemelerle hazırlanan eşsiz menümüzü keşfedin.',
            website_instagram='bidolu.kebap',
            website_facebook='bidolu.kebap',
            website_template='Modern Dark',
            website_enable_reservation=True,
            ext_qr_menu_enabled=True,
            ext_official_website_enabled=True,
            ext_crm_enabled=True,
            ext_whatsapp_enabled=False
        )

        # 10. Seed Customers
        Customer.objects.create(brand=brand, name="Ahmet Yılmaz", phone="0532 111 22 33", email="ahmet@gmail.com", total_orders=12, last_order_date="2026-06-01")
        Customer.objects.create(brand=brand, name="Mehmet Kaya", phone="0542 222 33 44", email="mehmet@gmail.com", total_orders=8, last_order_date="2026-06-03")
        Customer.objects.create(brand=brand, name="Ayşe Demir", phone="0505 333 44 55", email="ayse@gmail.com", total_orders=15, last_order_date="2026-06-05")

        # 11. Seed WhatsApp Config
        WhatsAppConfig.objects.create(
            brand=brand,
            api_key="wh_live_key_9921",
            phone_number_id="10984852",
            is_auto_message_enabled=True,
            message_template="Merhaba {customer_name}, {order_id} nolu siparişiniz başarıyla alınmıştır. Afiyet olsun!"
        )

        # 12. Seed Ingredients & Recipes
        ingredients_data = [
            {'name': 'Mercimek', 'stock_quantity': 50.0, 'unit': 'kg'},
            {'name': 'Kıyma', 'stock_quantity': 30.0, 'unit': 'kg'},
            {'name': 'Lavaş', 'stock_quantity': 200.0, 'unit': 'adet'},
            {'name': 'Tavuk Göğsü', 'stock_quantity': 40.0, 'unit': 'kg'},
            {'name': 'Patates', 'stock_quantity': 100.0, 'unit': 'kg'},
            {'name': 'Yoğurt', 'stock_quantity': 15.0, 'unit': 'kg'},
            {'name': 'Süt', 'stock_quantity': 50.0, 'unit': 'litre'},
        ]
        ingredients_dict = {}
        for ing in ingredients_data:
            obj = Ingredient.objects.create(brand=brand, name=ing['name'], stock_quantity=ing['stock_quantity'], unit=ing['unit'])
            ingredients_dict[ing['name']] = obj

        # Recipe for Mercimek Çorbası
        r1 = Recipe.objects.create(menu_item=menu_items_dict['Mercimek Çorbası'], instructions='Mercimeği haşla, blenderdan geçir, tereyağlı sos ekle.')
        RecipeIngredient.objects.create(recipe=r1, ingredient=ingredients_dict['Mercimek'], quantity=0.15, unit='kg')

        # Recipe for Adana Kebap
        r2 = Recipe.objects.create(menu_item=menu_items_dict['Adana Kebap'], instructions='Kıymayı baharatlarla yoğur, şişe sapla, kömür ateşinde pişir, lavaşla sar.')
        RecipeIngredient.objects.create(recipe=r2, ingredient=ingredients_dict['Kıyma'], quantity=0.20, unit='kg')
        RecipeIngredient.objects.create(recipe=r2, ingredient=ingredients_dict['Lavaş'], quantity=1.0, unit='adet')

        # Recipe for Tavuk Şiş
        r3 = Recipe.objects.create(menu_item=menu_items_dict['Tavuk Şiş'], instructions='Tavuğu marine et, şişe diz ve pişir.')
        RecipeIngredient.objects.create(recipe=r3, ingredient=ingredients_dict['Tavuk Göğsü'], quantity=0.22, unit='kg')

        # Seed Expenses
        Expense.objects.create(title='Dükkan Kirası', amount=4500.00, category='Kira', staff_member=staff1)
        Expense.objects.create(title='Manav Alımı', amount=1200.00, category='Gıda Malzemesi', staff_member=staff2)
        Expense.objects.create(title='Elektrik Faturası', amount=850.00, category='Fatura', staff_member=staff1)

        # Seed Couriers & Logs
        c1 = Courier.objects.create(brand=brand, name='Ahmet Yılmaz', phone='0555 111 2233', status='available', cash_advance_amount=150.00)
        c2 = Courier.objects.create(brand=brand, name='Mehmet Kaya', phone='0555 222 3344', status='on_delivery', cash_advance_amount=200.00)

        # Seed Historical Sales & Delivery Orders
        now = timezone.localtime()
        payment_methods = ['cash', 'card']
        
        # Seed last 7 days of completed orders
        for i in range(6, -1, -1):
            target_date = now - timedelta(days=i)
            num_orders = random.randint(5, 12) if i > 0 else random.randint(3, 6)
            
            for o_idx in range(num_orders):
                branch = random.choice(branches)
                is_delivery = random.choice([True, False])
                if is_delivery:
                    table_name = random.choice(['WebSitesi Paket', 'Yemeksepeti Paket', 'Getir Paket', 'Trendyol Paket', 'Migros Paket'])
                else:
                    table_name = random.choice(['Masa 1', 'Masa 2', 'Masa 3', 'Masa 4', 'Bahçe 1', 'Bahçe 2'])

                table = tables_dict[f"{branch.id}:{table_name}"]
                random_hour = random.randint(11, 22)
                random_minute = random.randint(0, 59)
                order_time = timezone.make_aware(
                    timezone.datetime.combine(
                        target_date.date(),
                        timezone.datetime.min.time()
                    )
                ) + timedelta(hours=random_hour, minutes=random_minute)
                
                order = Order.objects.create(
                    brand=brand,
                    branch=branch,
                    table=table,
                    status='completed',
                    created_at=order_time,
                    updated_at=order_time
                )
                
                # Add items
                num_items = random.randint(1, 3)
                order_items = random.sample(menu_items, num_items)
                total_amount = 0
                
                for mi in order_items:
                    qty = random.randint(1, 2)
                    price = mi.price
                    OrderItem.objects.create(
                        order=order,
                        menu_item=mi,
                        quantity=qty,
                        price=price,
                        status='served'
                    )
                    total_amount += price * qty
                
                order.total_amount = total_amount
                order.save()
                
                # Record payment in cash register too
                pay_method = random.choice(payment_methods)
                Payment.objects.create(
                    order=order,
                    amount=total_amount,
                    payment_method=pay_method,
                    created_at=order_time
                )
                cash_registers[branch.id].balance += total_amount
                cash_registers[branch.id].save()

                if is_delivery:
                    CourierLog.objects.create(
                        courier=random.choice([c1, c2]),
                        order=order,
                        timestamp=order_time,
                        status='delivered'
                    )
                
        self.stdout.write('Mock sales, recipes, inventory, staff, expenses, and courier logs successfully seeded.')
        self.stdout.write('Database seeding completed successfully!')
