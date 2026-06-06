from django.db import models

class Table(models.Model):
    STATUS_CHOICES = [
        ('empty', 'Boş'),
        ('occupied', 'Dolu'),
        ('bill_requested', 'Hesap İstendi'),
    ]
    name = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='empty')
    capacity = models.IntegerField(default=4)

    def __str__(self):
        return self.name

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, default='utensils')  # Lucide icon name

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class MenuItem(models.Model):
    category = models.ForeignKey(Category, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to='menu_images/', blank=True, null=True)

    def __str__(self):
        return self.name

class Order(models.Model):
    STATUS_CHOICES = [
        ('preparing', 'Hazırlanıyor'),
        ('ready', 'Hazır'),
        ('completed', 'Tamamlandı'),
        ('cancelled', 'İptal Edildi'),
    ]
    table = models.ForeignKey(Table, related_name='orders', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparing')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sipariş #{self.id} - {self.table.name}"

class OrderItem(models.Model):
    STATUS_CHOICES = [
        ('preparing', 'Hazırlanıyor'),
        ('ready', 'Hazır'),
        ('served', 'Servis Edildi'),
        ('cancelled', 'İptal Edildi'),
    ]
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot of price at purchase time
    note = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparing')

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} ({self.order.table.name})"

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Nakit'),
        ('card', 'Kredi Kartı'),
    ]
    order = models.ForeignKey(Order, related_name='payments', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_method.upper()} Ödeme ({self.amount} TL) - Sipariş #{self.order.id}"

# New models for extended POS functionality

class OrderChannel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    endpoint_url = models.URLField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name

class CashRegister(models.Model):
    name = models.CharField(max_length=100, unique=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    location = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.balance} TL"

class Ingredient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default='pcs')

    def __str__(self):
        return self.name

class Recipe(models.Model):
    menu_item = models.OneToOneField(MenuItem, related_name='recipe', on_delete=models.CASCADE)
    name = models.CharField(max_length=100, blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Recipe for {self.menu_item.name}"

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, related_name='ingredients', on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='pcs')

    def __str__(self):
        return f"{self.quantity}{self.unit} {self.ingredient.name} for {self.recipe.menu_item.name}"

class StaffMember(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=[('manager','Manager'),('staff','Staff'),('admin','Admin')], default='staff')
    hire_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class Expense(models.Model):
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateField(auto_now_add=True)
    staff_member = models.ForeignKey(StaffMember, related_name='expenses', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.amount} TL"

class Courier(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=50, default='available')
    cash_advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return self.name

class CourierLog(models.Model):
    courier = models.ForeignKey(Courier, related_name='logs', on_delete=models.CASCADE)
    order = models.ForeignKey(Order, related_name='courier_logs', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default='assigned')

    def __str__(self):
        return f"{self.courier.name} - Order #{self.order.id} ({self.status})"

class RestaurantProfile(models.Model):
    name = models.CharField(max_length=150, default='Bidolu Restoran')
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tax_office = models.CharField(max_length=100, blank=True, null=True)
    tax_number = models.CharField(max_length=50, blank=True, null=True)
    working_hours = models.CharField(max_length=100, default='09:00 - 23:00')
    active_plan = models.CharField(max_length=50, default='Growth') # 'Starter', 'Growth', 'Enterprise'
    plan_expiry = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.name


