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
from .auth_views import (
    login_view, register_view, logout_view, me_view,
    user_list_view, user_detail_view, seed_super_admin,
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
    # Auth endpoints
    path('auth/login/', login_view, name='auth-login'),
    path('auth/register/', register_view, name='auth-register'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/me/', me_view, name='auth-me'),
    path('auth/users/', user_list_view, name='auth-users'),
    path('auth/users/<int:user_id>/', user_detail_view, name='auth-user-detail'),
    path('auth/seed-super-admin/', seed_super_admin, name='auth-seed'),
]

