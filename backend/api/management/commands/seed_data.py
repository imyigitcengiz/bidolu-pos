from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from api.models import (
    Table, Category, MenuItem, Order, OrderItem, Payment,
    OrderChannel, CashRegister, Ingredient, Recipe, RecipeIngredient,
    StaffMember, Expense, Courier, CourierLog
)
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds initial mock data for the restaurant POS application including extended modules.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # 1. Clear existing data
        CourierLog.objects.all().delete()
        Courier.objects.all().delete()
        Expense.objects.all().delete()
        StaffMember.objects.all().delete()
        RecipeIngredient.objects.all().delete()
        Recipe.objects.all().delete()
        Ingredient.objects.all().delete()
        CashRegister.objects.all().delete()
        OrderChannel.objects.all().delete()
        Payment.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        Table.objects.all().delete()
        
        self.stdout.write('Existing data cleared.')

        # 2. Create Tables (Physical & Delivery/External Channels)
        tables_data = [
            {'name': 'Masa 1', 'capacity': 4},
            {'name': 'Masa 2', 'capacity': 2},
            {'name': 'Masa 3', 'capacity': 6},
            {'name': 'Masa 4', 'capacity': 4},
            {'name': 'Bahçe 1', 'capacity': 4},
            {'name': 'Bahçe 2', 'capacity': 8},
            {'name': 'VIP Salon', 'capacity': 10},
            # Virtual Tables for Delivery
            {'name': 'WebSitesi Paket', 'capacity': 1},
            {'name': 'Yemeksepeti Paket', 'capacity': 1},
            {'name': 'Getir Paket', 'capacity': 1},
            {'name': 'Trendyol Paket', 'capacity': 1},
            {'name': 'Migros Paket', 'capacity': 1},
        ]
        tables = []
        tables_dict = {}
        for t in tables_data:
            table = Table.objects.create(name=t['name'], capacity=t['capacity'], status='empty')
            tables.append(table)
            tables_dict[t['name']] = table
        
        self.stdout.write(f'{len(tables)} tables created.')

        # 3. Create Categories
        categories_data = [
            {'name': 'Çorbalar', 'icon': 'soup'},
            {'name': 'Ana Yemekler', 'icon': 'utensils'},
            {'name': 'Salatalar', 'icon': 'salad'},
            {'name': 'Tatlılar', 'icon': 'cake'},
            {'name': 'İçecekler', 'icon': 'cup-soda'},
        ]
        categories = {}
        for c in categories_data:
            cat = Category.objects.create(name=c['name'], icon=c['icon'])
            categories[c['name']] = cat
            
        self.stdout.write(f'{len(categories)} categories created.')

        # 4. Create Menu Items
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
                category=categories[item['category']],
                name=item['name'],
                price=item['price'],
                description=item['description'],
                is_available=True
            )
            menu_items.append(mi)
            menu_items_dict[item['name']] = mi
            
        self.stdout.write(f'{len(menu_items)} menu items created.')

        # 5. Seed Order Channels
        channels_data = [
            {'name': 'WebSitesi', 'api_key': 'web-secret-key-123'},
            {'name': 'Yemeksepeti', 'api_key': 'ys-secret-key-456'},
            {'name': 'Getir', 'api_key': 'getir-secret-key-789'},
            {'name': 'Trendyol Yemek', 'api_key': 'ty-secret-key-101'},
            {'name': 'Migros Yemek', 'api_key': 'migros-secret-key-202'},
        ]
        for ch in channels_data:
            OrderChannel.objects.create(name=ch['name'], api_key=ch['api_key'], endpoint_url='https://api.bidolupos.com/webhook')

        # 6. Seed Cash Register
        cash_register = CashRegister.objects.create(name='Ana Kasa', balance=8500.00, location='Giriş Danışma')

        # 7. Seed Ingredients & Recipes
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
            obj = Ingredient.objects.create(name=ing['name'], stock_quantity=ing['stock_quantity'], unit=ing['unit'])
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

        # 8. Seed Staff
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user, _ = User.objects.get_or_create(username='im.yigit', email='yigit@bidolupos.com')
            admin_user.set_password('Yigoc3535-*')
            admin_user.is_superuser = True
            admin_user.is_staff = True
            admin_user.save()

        staff1 = StaffMember.objects.create(user=admin_user, role='admin', hire_date=timezone.now().date() - timedelta(days=30))
        
        garson_user, _ = User.objects.get_or_create(username='garson1', email='garson1@bidolupos.com')
        garson_user.set_password('Yigoc3535-*')
        garson_user.save()
        staff2 = StaffMember.objects.create(user=garson_user, role='staff', hire_date=timezone.now().date() - timedelta(days=15))

        # 9. Seed Expenses
        Expense.objects.create(title='Dükkan Kirası', amount=4500.00, category='Kira', staff_member=staff1)
        Expense.objects.create(title='Manav Alımı', amount=1200.00, category='Gıda Malzemesi', staff_member=staff2)
        Expense.objects.create(title='Elektrik Faturası', amount=850.00, category='Fatura', staff_member=staff1)

        # 10. Seed Couriers & Logs
        c1 = Courier.objects.create(name='Ahmet Yılmaz', phone='0555 111 2233', status='available', cash_advance_amount=150.00)
        c2 = Courier.objects.create(name='Mehmet Kaya', phone='0555 222 3344', status='on_delivery', cash_advance_amount=200.00)

        # 11. Seed Historical Sales & Delivery Orders
        now = timezone.localtime()
        payment_methods = ['cash', 'card']
        
        # Seed last 7 days of completed orders
        for i in range(6, -1, -1):
            target_date = now - timedelta(days=i)
            num_orders = random.randint(5, 12) if i > 0 else random.randint(3, 6)
            
            for o_idx in range(num_orders):
                # Let some orders be physical tables and others be delivery channels
                is_delivery = random.choice([True, False])
                if is_delivery:
                    table_name = random.choice(['WebSitesi Paket', 'Yemeksepeti Paket', 'Getir Paket', 'Trendyol Paket', 'Migros Paket'])
                else:
                    table_name = random.choice(['Masa 1', 'Masa 2', 'Masa 3', 'Masa 4', 'Bahçe 1', 'Bahçe 2'])
                
                table = tables_dict[table_name]
                random_hour = random.randint(11, 22)
                random_minute = random.randint(0, 59)
                order_time = timezone.make_aware(
                    timezone.datetime.combine(
                        target_date.date(),
                        timezone.datetime.min.time()
                    )
                ) + timedelta(hours=random_hour, minutes=random_minute)
                
                order = Order.objects.create(
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
                cash_register.balance += total_amount
                cash_register.save()

                # If delivery, add a courier log
                if is_delivery:
                    CourierLog.objects.create(
                        courier=random.choice([c1, c2]),
                        order=order,
                        timestamp=order_time,
                        status='delivered'
                    )
                
        self.stdout.write('Mock sales, recipes, inventory, staff, expenses, and courier logs successfully seeded.')
        self.stdout.write('Database seeding completed successfully!')
