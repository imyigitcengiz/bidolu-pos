from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TableViewSet, CategoryViewSet, MenuItemViewSet, MenuItemModifierViewSet,
    OrderViewSet, OrderItemViewSet, DashboardStatsView,
    OrderChannelViewSet, CashRegisterViewSet, IngredientViewSet,
    RecipeViewSet, RecipeIngredientViewSet, StaffMemberViewSet,
    ExpenseViewSet, CourierViewSet, CourierLogViewSet, RestaurantProfileViewSet,
    CashTransactionViewSet, StockAuditViewSet, CustomerViewSet, WhatsAppConfigViewSet,
    LowStockView,
)

router = DefaultRouter()
router.register(r'tables', TableViewSet, basename='table')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'menu-items', MenuItemViewSet, basename='menu-item')
router.register(r'menu-item-modifiers', MenuItemModifierViewSet, basename='menuitemmodifier')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-items', OrderItemViewSet, basename='orderitem')
router.register(r'order-channels', OrderChannelViewSet, basename='orderchannel')
router.register(r'cash-registers', CashRegisterViewSet, basename='cashregister')
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'recipes', RecipeViewSet, basename='recipe')
router.register(r'recipe-ingredients', RecipeIngredientViewSet, basename='recipeingredient')
router.register(r'staff-members', StaffMemberViewSet, basename='staffmember')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'couriers', CourierViewSet, basename='courier')
router.register(r'courier-logs', CourierLogViewSet, basename='courierlog')
router.register(r'restaurant-profile', RestaurantProfileViewSet, basename='restaurantprofile')
router.register(r'cash-transactions', CashTransactionViewSet, basename='cashtransaction')
router.register(r'stock-audits', StockAuditViewSet, basename='stockaudit')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'whatsapp-configs', WhatsAppConfigViewSet, basename='whatsappconfig')


urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('low-stock/', LowStockView.as_view(), name='low-stock'),
]
