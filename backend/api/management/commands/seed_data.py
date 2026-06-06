from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Table, Category, MenuItem, Order, OrderItem, Payment
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds initial mock data for the restaurant POS application.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # 1. Clear existing data
        Payment.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        Table.objects.all().delete()
        
        self.stdout.write('Existing data cleared.')

        # 2. Create Tables
        tables_data = [
            {'name': 'Masa 1', 'capacity': 4},
            {'name': 'Masa 2', 'capacity': 2},
            {'name': 'Masa 3', 'capacity': 6},
            {'name': 'Masa 4', 'capacity': 4},
            {'name': 'Bahçe 1', 'capacity': 4},
            {'name': 'Bahçe 2', 'capacity': 8},
            {'name': 'VIP Salon', 'capacity': 10},
        ]
        tables = []
        for t in tables_data:
            table = Table.objects.create(name=t['name'], capacity=t['capacity'], status='empty')
            tables.append(table)
        
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
            # Çorbalar
            {'category': 'Çorbalar', 'name': 'Mercimek Çorbası', 'price': 65.00, 'description': 'Limon ve kruton ile servis edilir.'},
            {'category': 'Çorbalar', 'name': 'Ezogelin Çorbası', 'price': 70.00, 'description': 'Geleneksel lezzet.'},
            # Ana Yemekler
            {'category': 'Ana Yemekler', 'name': 'Adana Kebap', 'price': 280.00, 'description': 'Közlenmiş biber, domates ve lavaş ile.'},
            {'category': 'Ana Yemekler', 'name': 'Tavuk Şiş', 'price': 220.00, 'description': 'Bulgur pilavı ve yeşillik ile.'},
            {'category': 'Ana Yemekler', 'name': 'Mantı', 'price': 190.00, 'description': 'Tereyağlı sos ve yoğurt eşliğinde.'},
            {'category': 'Ana Yemekler', 'name': 'Köfte Izgara', 'price': 240.00, 'description': 'Patates kızartması ve pilav ile.'},
            # Salatalar
            {'category': 'Salatalar', 'name': 'Mevsim Salatası', 'price': 90.00, 'description': 'Taze mevsim yeşillikleri.'},
            {'category': 'Salatalar', 'name': 'Çoban Salatası', 'price': 95.00, 'description': 'Domates, salatalık, biber, zeytinyağı.'},
            # Tatlılar
            {'category': 'Tatlılar', 'name': 'Künefe', 'price': 150.00, 'description': 'Antep fıstıklı sıcak şerbetli tatlı.'},
            {'category': 'Tatlılar', 'name': 'Fırın Sütlaç', 'price': 110.00, 'description': 'Geleneksel fırınlanmış sütlaç.'},
            {'category': 'Tatlılar', 'name': 'Baklava', 'price': 160.00, 'description': 'Fıstıklı ev baklavası (3 dilim).'},
            # İçecekler
            {'category': 'İçecekler', 'name': 'Ayran', 'price': 35.00, 'description': 'Yayık ayranı.'},
            {'category': 'İçecekler', 'name': 'Kola', 'price': 50.00, 'description': 'Kutu kola.'},
            {'category': 'İçecekler', 'name': 'Şalgam Suyu', 'price': 40.00, 'description': 'Acılı veya acısız seçenekleriyle.'},
            {'category': 'İçecekler', 'name': 'Su', 'price': 15.00, 'description': '0.5L pet şişe.'},
        ]
        menu_items = []
        for item in menu_items_data:
            mi = MenuItem.objects.create(
                category=categories[item['category']],
                name=item['name'],
                price=item['price'],
                description=item['description'],
                is_available=True
            )
            menu_items.append(mi)
            
        self.stdout.write(f'{len(menu_items)} menu items created.')

        # 5. Seed Historical Sales (for dashboard charts)
        now = timezone.localtime()
        payment_methods = ['cash', 'card']
        
        # Seed last 7 days of completed orders
        for i in range(6, -1, -1):
            target_date = now - timedelta(days=i)
            # Create between 5 and 12 orders per day
            num_orders = random.randint(5, 12) if i > 0 else random.randint(3, 6) # Less for today so far
            
            for _ in range(num_orders):
                # Pick a random table
                table = random.choice(tables)
                # Random time of day
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
                
                # Add 2 to 5 random items to the order
                num_items = random.randint(2, 5)
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
                
                # Make payments
                pay_method = random.choice(payment_methods)
                payment = Payment.objects.create(
                    order=order,
                    amount=total_amount,
                    payment_method=pay_method,
                    created_at=order_time
                )
                
        self.stdout.write('Mock sales history successfully seeded.')
        self.stdout.write('Database seeding completed successfully!')
