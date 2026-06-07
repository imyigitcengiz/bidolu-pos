from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Brand(models.Model):
    """Multi-tenant brand/store model. Each registered user creates a brand."""
    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('growth', 'Growth'),
        ('enterprise', 'Enterprise'),
    ]
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_brands')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    plan_expiry = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_plan_display()})"


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('super_admin', 'Süper Yönetici'),
        ('store_owner', 'Kurum Yöneticisi'),
        ('manager', 'Operasyon Müdürü'),
        ('waiter', 'Servis Sorumlusu'),
        ('cashier', 'Finans Sorumlusu'),
        ('kitchen', 'Üretim Sorumlusu'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='waiter')
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, blank=True, null=True, related_name='members')

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


class Table(models.Model):
    STATUS_CHOICES = [
        ('empty', 'Boş'),
        ('occupied', 'Dolu'),
        ('bill_requested', 'Hesap İstendi'),
    ]
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='tables', null=True, blank=True)
    branch = models.ForeignKey('Branch', on_delete=models.CASCADE, related_name='tables', null=True, blank=True)
    name = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='empty')
    capacity = models.IntegerField(default=4)

    class Meta:
        unique_together = ('brand', 'branch', 'name')

    def __str__(self):
        return f"{self.name} ({self.brand.name if self.brand else 'No Brand'})"

class Category(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    name = models.CharField(max_length=50)
    icon = models.CharField(max_length=50, default='utensils')  # Lucide icon name

    class Meta:
        verbose_name_plural = "Categories"
        unique_together = ('brand', 'name')

    def __str__(self):
        return f"{self.name} ({self.brand.name if self.brand else 'No Brand'})"

class MenuItem(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='menu_items', null=True, blank=True)
    category = models.ForeignKey(Category, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to='menu_images/', blank=True, null=True)

    def __str__(self):
        return self.name

class MenuItemModifier(models.Model):
    menu_item = models.ForeignKey(MenuItem, related_name='modifiers', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)  # e.g. 'Ekstra Peynir', 'Büyük Boy'
    price_extra = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_required = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (+{self.price_extra} TL) for {self.menu_item.name}"

class Order(models.Model):
    STATUS_CHOICES = [
        ('preparing', 'Hazırlanıyor'),
        ('ready', 'Hazır'),
        ('completed', 'Tamamlandı'),
        ('cancelled', 'İptal Edildi'),
    ]
    DISCOUNT_TYPE_CHOICES = [
        ('none', 'İndirim Yok'),
        ('percent', 'Yüzde (%)'),
        ('fixed', 'Sabit (TL)'),
    ]
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    branch = models.ForeignKey('Branch', on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    table = models.ForeignKey(Table, related_name='orders', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparing')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='none')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_reason = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def discounted_total(self):
        if self.discount_type == 'percent':
            return max(0, float(self.total_amount) * (1 - float(self.discount_value) / 100))
        elif self.discount_type == 'fixed':
            return max(0, float(self.total_amount) - float(self.discount_value))
        return float(self.total_amount)

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
    modifier_text = models.CharField(max_length=500, blank=True, null=True)  # e.g. 'Ekstra Peynir, Büyük Boy'
    modifier_extra = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)  # total extra from modifiers
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
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='order_channels', null=True, blank=True)
    name = models.CharField(max_length=100)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    endpoint_url = models.URLField(max_length=255, blank=True, null=True)

    class Meta:
        unique_together = ('brand', 'name')

    def __str__(self):
        return self.name

class CashRegister(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='cash_registers', null=True, blank=True)
    branch = models.ForeignKey('Branch', on_delete=models.CASCADE, related_name='cash_registers', null=True, blank=True)
    name = models.CharField(max_length=100)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    location = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        unique_together = ('brand', 'name')

    def __str__(self):
        return f"{self.name} - {self.balance} TL"

class Ingredient(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='ingredients', null=True, blank=True)
    name = models.CharField(max_length=100)
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default='pcs')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('brand', 'name')

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
    role = models.CharField(max_length=50, choices=[
        ('store_owner', 'Kurum Yöneticisi'),
        ('manager', 'Operasyon Müdürü'),
        ('waiter', 'Servis Sorumlusu'),
        ('cashier', 'Finans Sorumlusu'),
        ('kitchen', 'Üretim Sorumlusu'),
    ], default='waiter')
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
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='couriers', null=True, blank=True)
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
    brand = models.OneToOneField(Brand, on_delete=models.CASCADE, related_name='restaurant_profile', null=True, blank=True)
    name = models.CharField(max_length=150, default='Bidolu Restoran')
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tax_office = models.CharField(max_length=100, blank=True, null=True)
    tax_number = models.CharField(max_length=50, blank=True, null=True)
    working_hours = models.CharField(max_length=100, default='09:00 - 23:00')
    active_plan = models.CharField(max_length=50, default='Growth') # 'Starter', 'Growth', 'Enterprise'
    plan_expiry = models.DateField(blank=True, null=True)
    website_slug = models.CharField(max_length=100, default='bidolu-restoran')
    website_theme_color = models.CharField(max_length=30, default='#6366f1')
    website_banner_text = models.CharField(max_length=255, default='Hoş Geldiniz!')
    website_enable_table_orders = models.BooleanField(default=True)
    website_enable_delivery = models.BooleanField(default=True)
    website_enable_takeaway = models.BooleanField(default=True)
    website_custom_domain = models.CharField(max_length=255, blank=True, null=True)
    website_about_text = models.TextField(blank=True, null=True)
    website_instagram = models.CharField(max_length=100, blank=True, null=True)
    website_facebook = models.CharField(max_length=100, blank=True, null=True)
    website_template = models.CharField(max_length=50, default='Modern Dark')
    website_enable_reservation = models.BooleanField(default=True)
    ext_qr_menu_enabled = models.BooleanField(default=True)
    ext_official_website_enabled = models.BooleanField(default=True)
    ext_crm_enabled = models.BooleanField(default=True)
    ext_whatsapp_enabled = models.BooleanField(default=False)
    ext_live_courier_enabled = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class CashTransaction(models.Model):
    register = models.ForeignKey(CashRegister, related_name='transactions', on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=10, choices=[('in', 'Giriş'), ('out', 'Çıkış')])
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            reg = self.register
            if self.transaction_type == 'in':
                reg.balance += self.amount
            else:
                reg.balance -= self.amount
            reg.save()

    def __str__(self):
        return f"{self.transaction_type.upper()} - {self.amount} TL - {self.description}"

class StockAudit(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=255, blank=True, null=True)
    total_variance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Sayım - {self.date.strftime('%d.%m.%Y %H:%M')} - Fark: {self.total_variance_amount} TL"

class StockAuditItem(models.Model):
    audit = models.ForeignKey(StockAudit, related_name='items', on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    system_stock = models.DecimalField(max_digits=10, decimal_places=2)
    actual_stock = models.DecimalField(max_digits=10, decimal_places=2)
    variance = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_difference = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.ingredient.name} sayım farkı: {self.variance} {self.ingredient.unit}"

class Customer(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    total_orders = models.IntegerField(default=0)
    last_order_date = models.DateField(blank=True, null=True)
    subscription_status = models.CharField(max_length=30, default='active')

    class Meta:
        unique_together = ('brand', 'phone')

    def __str__(self):
        return f"{self.name} ({self.phone})"

class WhatsAppConfig(models.Model):
    brand = models.OneToOneField(Brand, on_delete=models.CASCADE, related_name='whatsapp_config', null=True, blank=True)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    phone_number_id = models.CharField(max_length=100, blank=True, null=True)
    is_auto_message_enabled = models.BooleanField(default=True)
    message_template = models.TextField(default="Merhaba {customer_name}, {order_id} nolu siparişiniz alınmıştır. Afiyet olsun!")
    is_live_chat_enabled = models.BooleanField(default=False)
    ask_admin_before_sending = models.BooleanField(default=True)

    def __str__(self):
        return f"WhatsApp Config - Enabled: {self.is_auto_message_enabled}"


class Branch(models.Model):
    brand = models.ForeignKey(Brand, related_name='branches', on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    city = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    # Harici franchise paneli — şifreyi kurum yöneticisi belirler
    panel_slug = models.SlugField(max_length=80, unique=True, blank=True, null=True)
    panel_password = models.CharField(max_length=128, blank=True, null=True)
    panel_enabled = models.BooleanField(default=False)
    panel_password_updated_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('brand', 'name')

    def __str__(self):
        return f"{self.name} ({self.brand.name})"


class FranchisePanelToken(models.Model):
    """Harici franchise panel oturum token'ı — kullanıcı hesabı gerektirmez."""
    branch = models.ForeignKey(Branch, related_name='panel_tokens', on_delete=models.CASCADE)
    key = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Franchise token — {self.branch.name}"


class AuditLog(models.Model):
    """Güvenlik izi — impersonation ve kritik işlemler."""
    ACTION_CHOICES = [
        ('impersonate', 'Hesaba Gir'),
        ('brand_enter', 'Mağazaya Gir'),
    ]
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_actions')
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_targets')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    metadata = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} by {self.actor_id} at {self.created_at}"


class Invoice(models.Model):
    PAYMENT_PROVIDER_CHOICES = [
        ('mock', 'Mock'),
        ('stripe', 'Stripe'),
        ('iyzico', 'iyzico'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Bekliyor'),
        ('paid', 'Ödendi'),
        ('failed', 'Başarısız'),
        ('cancelled', 'İptal'),
    ]

    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    plan = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    paid = models.BooleanField(default=False)
    payment_provider = models.CharField(max_length=20, choices=PAYMENT_PROVIDER_CHOICES, default='mock')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    external_id = models.CharField(max_length=255, blank=True, null=True)
    checkout_url = models.URLField(max_length=500, blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.invoice_number} - {self.brand.name} ({self.amount} TL)"




