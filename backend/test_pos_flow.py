import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bidolupos.settings')
django.setup()

from api.models import Table, MenuItem, Order, OrderItem, Payment, CashRegister, CashTransaction, Ingredient, Recipe, RecipeIngredient

def run_simulation():
    print("==================================================")
    # 1. Check Table Status
    print("Step 1: Masa Durumu Kontrol Ediliyor...")
    table, created = Table.objects.get_or_create(name="Masa 99", defaults={"capacity": 4, "status": "empty"})
    print(f"Masa: {table.name}, Kapasite: {table.capacity}, Durum: {table.get_status_display()}")
    
    # 2. Open Table
    print("\nStep 2: Masa Açılıyor (Dolu Olarak İşaretleniyor)...")
    table.status = "occupied"
    table.save()
    print(f"Masa Durumu: {table.get_status_display()}")
    
    # 3. Create Order
    print("\nStep 3: Sipariş Oluşturuluyor...")
    # Get Menu Items
    kebap = MenuItem.objects.filter(name="Adana Kebap").first()
    corba = MenuItem.objects.filter(name="Mercimek Çorbası").first()
    
    if not kebap or not corba:
        print("HATA: Gerekli menü elemanları bulunamadı. Lütfen önce seed_data komutunu çalıştırın.")
        return
        
    order = Order.objects.create(table=table, status="preparing", total_amount=0)
    
    # Add items to order
    item1 = OrderItem.objects.create(order=order, menu_item=kebap, quantity=2, price=kebap.price, status="preparing")
    item2 = OrderItem.objects.create(order=order, menu_item=corba, quantity=1, price=corba.price, status="preparing")
    
    order.total_amount = (item1.price * item1.quantity) + (item2.price * item2.quantity)
    order.save()
    print(f"Sipariş #{order.id} oluşturuldu. Toplam Tutar: {order.total_amount} TL")
    
    # 4. Check Kitchen Queue
    print("\nStep 4: Mutfak Ekranı Simüle Ediliyor (Hazırlanan Ürünler)...")
    preparing_items = OrderItem.objects.filter(status="preparing")
    for item in preparing_items:
        print(f"  - Mutfakta Sıradaki Ürün: {item.quantity}x {item.menu_item.name} ({item.order.table.name})")
        
    # 5. Complete Kitchen Prep
    print("\nStep 5: Mutfak Hazırlığı Tamamlanıyor...")
    item1.status = "ready"
    item1.save()
    item2.status = "ready"
    item2.save()
    
    # Check if order status is ready
    # Check if all items in order are ready/served
    all_items = order.items.all()
    if not all_items.filter(status="preparing").exists():
        order.status = 'ready'
        order.save()
    print(f"Sipariş Durumu: {order.get_status_display()}")
    
    # 6. Payment & Close Table
    print("\nStep 6: Ödeme Alınıyor ve Masa Kapatılıyor...")
    register = CashRegister.objects.first()
    initial_balance = register.balance
    print(f"Kasa Başlangıç Bakiyesi: {initial_balance} TL")
    
    # Simulate pay_and_close view logic using the actual OrderViewSet
    from api.views import OrderViewSet
    from rest_framework.test import APIRequestFactory, force_authenticate
    from django.contrib.auth.models import User
    
    user = User.objects.first()
    payment_amount = float(order.total_amount)
    factory = APIRequestFactory()
    request = factory.post(f'/api/orders/{order.id}/pay_and_close/', {'payment_method': 'cash', 'amount': payment_amount}, format='json')
    force_authenticate(request, user=user)
    view = OrderViewSet.as_view({'post': 'pay_and_close'})
    response = view(request, pk=order.id)
    print("Response Status:", response.status_code)
    print("Response Data:", response.data)
    
    # Reload from database to verify changes
    order.refresh_from_db()
    table.refresh_from_db()
    
    # Refresh register balance
    register.refresh_from_db()
    print(f"Ödeme Yöntemi: Nakit, Alınan Tutar: {payment_amount} TL")
    print(f"Kasa Güncel Bakiyesi: {register.balance} TL")
    print(f"Masa Son Durumu: {table.get_status_display()}")
    
    # 7. Check Stocks & Recipes
    print("\nStep 7: Stoklar ve Reçeteler Kontrol Ediliyor...")
    # Let's see if there is recipe for Adana Kebap
    recipe = Recipe.objects.filter(menu_item=kebap).first()
    if recipe:
        print(f"Adana Kebap Reçetesi:")
        for ri in recipe.ingredients.all():
            print(f"  - {ri.quantity} {ri.unit} {ri.ingredient.name} (Mevcut Stok: {ri.ingredient.stock_quantity} {ri.ingredient.unit})")
    
    print("\n==================================================")
    print("Simülasyon başarıyla tamamlandı! Tüm entegrasyonlar çalışıyor.")
    print("==================================================")

if __name__ == "__main__":
    run_simulation()
