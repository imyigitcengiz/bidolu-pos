from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TableViewSet, CategoryViewSet, MenuItemViewSet, MenuItemModifierViewSet,
    OrderViewSet, OrderItemViewSet, DashboardStatsView,
    OrderChannelViewSet, CashRegisterViewSet, IngredientViewSet,
    RecipeViewSet, RecipeIngredientViewSet, StaffMemberViewSet,
    ExpenseViewSet, CourierViewSet, CourierLogViewSet, RestaurantProfileViewSet,
    CashTransactionViewSet, StockAuditViewSet, CustomerViewSet, WhatsAppConfigViewSet,
    LowStockView, ReportStatsView, BranchViewSet,
)
from .auth_views import (
    login_view, public_register_view, register_view, logout_view, me_view,
    user_list_view, user_detail_view, seed_super_admin,
    impersonate_view, brand_list_view, brand_detail_view, brand_enter_view, super_admin_stats_view,
    change_plan_view, invoice_list_view, plan_status_view,
)
from .franchise_views import (
    franchise_login_view, franchise_logout_view, franchise_dashboard_view,
    franchise_tables_view, franchise_orders_view, franchise_order_detail_view,
    franchise_order_pay_view, franchise_menu_view, franchise_table_status_view,
    branch_panel_password_view, platform_metrics_view,
)
from .payment_views import (
    checkout_init_view, payment_providers_view,
    stripe_verify_view, stripe_webhook_view, iyzico_callback_view,
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
router.register(r'branches', BranchViewSet, basename='branch')


urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('low-stock/', LowStockView.as_view(), name='low-stock'),
    path('report-stats/', ReportStatsView.as_view(), name='report-stats'),
    # Auth endpoints
    path('auth/login/', login_view, name='auth-login'),
    path('auth/register/', public_register_view, name='auth-public-register'),
    path('auth/register-staff/', register_view, name='auth-register-staff'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/me/', me_view, name='auth-me'),
    path('auth/users/', user_list_view, name='auth-users'),
    path('auth/users/<int:user_id>/', user_detail_view, name='auth-user-detail'),
    path('auth/users/<int:user_id>/impersonate/', impersonate_view, name='auth-impersonate'),
    path('auth/seed-super-admin/', seed_super_admin, name='auth-seed'),
    # Brand endpoints
    path('auth/brands/', brand_list_view, name='auth-brands'),
    path('auth/brands/<int:brand_id>/', brand_detail_view, name='auth-brand-detail'),
    path('auth/brands/<int:brand_id>/enter/', brand_enter_view, name='auth-brand-enter'),
    path('auth/brands/<int:brand_id>/change-plan/', change_plan_view, name='auth-brand-change-plan'),
    path('auth/brands/<int:brand_id>/checkout/', checkout_init_view, name='auth-brand-checkout'),
    path('auth/payment-providers/', payment_providers_view, name='auth-payment-providers'),
    path('payments/stripe/verify/', stripe_verify_view, name='payments-stripe-verify'),
    path('payments/stripe/webhook/', stripe_webhook_view, name='payments-stripe-webhook'),
    path('payments/iyzico/callback/', iyzico_callback_view, name='payments-iyzico-callback'),
    path('auth/invoices/', invoice_list_view, name='auth-invoices'),
    path('auth/plan-status/', plan_status_view, name='auth-plan-status'),
    path('auth/super-stats/', super_admin_stats_view, name='auth-super-stats'),
    path('auth/platform-metrics/', platform_metrics_view, name='auth-platform-metrics'),
    # Franchise harici panel
    path('franchise/login/', franchise_login_view, name='franchise-login'),
    path('franchise/logout/', franchise_logout_view, name='franchise-logout'),
    path('franchise/dashboard/', franchise_dashboard_view, name='franchise-dashboard'),
    path('franchise/tables/', franchise_tables_view, name='franchise-tables'),
    path('franchise/orders/', franchise_orders_view, name='franchise-orders'),
    path('franchise/orders/<int:order_id>/', franchise_order_detail_view, name='franchise-order-detail'),
    path('franchise/orders/<int:order_id>/pay_and_close/', franchise_order_pay_view, name='franchise-order-pay'),
    path('franchise/menu/', franchise_menu_view, name='franchise-menu'),
    path('franchise/tables/<int:table_id>/change_status/', franchise_table_status_view, name='franchise-table-status'),
    path('branches/<int:branch_id>/panel-access/', branch_panel_password_view, name='branch-panel-access'),
]

