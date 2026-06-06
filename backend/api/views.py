from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, F
from django.utils import timezone
from datetime import timedelta
from .models import (
    Table, Category, MenuItem, Order, OrderItem, Payment,
    OrderChannel, CashRegister, Ingredient, Recipe, RecipeIngredient,
    StaffMember, Expense, Courier, CourierLog, RestaurantProfile,
)
from .serializers import (
    TableSerializer, CategorySerializer, MenuItemSerializer,
    OrderSerializer, OrderItemSerializer, PaymentSerializer,
    OrderChannelSerializer, CashRegisterSerializer, IngredientSerializer,
    RecipeSerializer, RecipeIngredientSerializer, StaffMemberSerializer,
    ExpenseSerializer, CourierSerializer, CourierLogSerializer,
    RestaurantProfileSerializer,
)

class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all().order_by('name')
    serializer_class = TableSerializer

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        table = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(Table.STATUS_CHOICES):
            table.status = new_status
            table.save()
            return Response(TableSerializer(table).data)
        return Response({'error': 'Geçersiz durum'}, status=status.HTTP_400_BAD_REQUEST)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all().order_by('name')
    serializer_class = MenuItemSerializer

    def get_queryset(self):
        queryset = MenuItem.objects.all().order_by('name')
        category_id = self.request.query_params.get('category', None)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        return queryset

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-id')
    serializer_class = OrderSerializer

    def get_queryset(self):
        queryset = Order.objects.all().order_by('-id')
        table_id = self.request.query_params.get('table', None)
        active_only = self.request.query_params.get('active', None)
        
        if table_id is not None:
            queryset = queryset.filter(table_id=table_id)
        if active_only == 'true':
            queryset = queryset.exclude(status='completed').exclude(status='cancelled')
        return queryset

    def create(self, request, *args, **kwargs):
        table_id = request.data.get('table')
        items_data = request.data.get('items', [])
        
        try:
            table = Table.objects.get(id=table_id)
        except Table.DoesNotExist:
            return Response({'error': 'Masa bulunamadı'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update table status to occupied
        table.status = 'occupied'
        table.save()
        
        # Check if there is already an active order for this table
        active_order = Order.objects.filter(table=table).exclude(status__in=['completed', 'cancelled']).first()
        if active_order:
            order = active_order
        else:
            order = Order.objects.create(table=table, status='preparing')
        
        total_amount = order.total_amount
        for item in items_data:
            try:
                menu_item = MenuItem.objects.get(id=item['menu_item'])
            except MenuItem.DoesNotExist:
                continue
            
            quantity = int(item.get('quantity', 1))
            note = item.get('note', '')
            price = menu_item.price
            
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                price=price,
                note=note,
                status='preparing'
            )
            total_amount += price * quantity
            
        order.total_amount = total_amount
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pay_and_close(self, request, pk=None):
        order = self.get_object()
        payment_method = request.data.get('payment_method')
        amount = request.data.get('amount')
        
        if not payment_method or not amount:
            return Response({'error': 'Ödeme yöntemi ve tutar gereklidir'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Record payment
        Payment.objects.create(
            order=order,
            amount=amount,
            payment_method=payment_method
        )
        
        # Update order status to completed
        order.status = 'completed'
        order.save()
        
        # Empty the table
        table = order.table
        table.status = 'empty'
        table.save()
        
        return Response({'message': 'Ödeme alındı ve masa kapatıldı', 'order': OrderSerializer(order).data})

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all().order_by('-id')
    serializer_class = OrderItemSerializer

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(OrderItem.STATUS_CHOICES):
            item.status = new_status
            item.save()
            
            # Check if all items in order are ready/served, if so, update order status
            order = item.order
            all_items = order.items.all()
            
            if not all_items.filter(status='preparing').exists():
                order.status = 'ready'
                order.save()
                
            return Response(OrderItemSerializer(item).data)
        return Response({'error': 'Geçersiz durum'}, status=status.HTTP_400_BAD_REQUEST)

class DashboardStatsView(views.APIView):
    def get(self, request):
        today = timezone.localtime().date()
        start_of_today = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        
        # Total revenue today
        today_payments = Payment.objects.filter(created_at__gte=start_of_today)
        today_revenue = today_payments.aggregate(total=Sum('amount'))['total'] or 0.00
        
        # Active tables
        active_tables = Table.objects.exclude(status='empty').count()
        empty_tables = Table.objects.filter(status='empty').count()
        
        # Active orders (preparing or ready)
        active_orders = Order.objects.filter(status__in=['preparing', 'ready']).count()
        
        # Popular items (top 5)
        popular = OrderItem.objects.filter(
            order__status='completed'
        ).values(
            name=F('menu_item__name')
        ).annotate(
            count=Sum('quantity')
        ).order_by('-count')[:5]
        
        # Revenue by payment method
        payment_methods = today_payments.values('payment_method').annotate(total=Sum('amount'))
        methods_data = {
            'cash': 0.00,
            'card': 0.00
        }
        for pm in payment_methods:
            methods_data[pm['payment_method']] = pm['total']
            
        # Last 7 days daily sales
        daily_sales = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = timezone.make_aware(timezone.datetime.combine(day, timezone.datetime.min.time()))
            day_end = timezone.make_aware(timezone.datetime.combine(day, timezone.datetime.max.time()))
            
            day_revenue = Payment.objects.filter(
                created_at__range=(day_start, day_end)
            ).aggregate(total=Sum('amount'))['total'] or 0.00
            
            daily_sales.append({
                'date': day.strftime('%d.%m'),
                'revenue': float(day_revenue)
            })

        return Response({
            'today_revenue': float(today_revenue),
            'active_tables': active_tables,
            'empty_tables': empty_tables,
            'active_orders': active_orders,
            'popular_items': list(popular),
            'payment_methods': methods_data,
            'daily_sales': daily_sales
        })

class OrderChannelViewSet(viewsets.ModelViewSet):
    queryset = OrderChannel.objects.all().order_by('name')
    serializer_class = OrderChannelSerializer

class CashRegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.all().order_by('name')
    serializer_class = CashRegisterSerializer

class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all().order_by('name')
    serializer_class = IngredientSerializer

class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().order_by('id')
    serializer_class = RecipeSerializer

class RecipeIngredientViewSet(viewsets.ModelViewSet):
    queryset = RecipeIngredient.objects.all().order_by('id')
    serializer_class = RecipeIngredientSerializer

class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all().order_by('id')
    serializer_class = StaffMemberSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer

class CourierViewSet(viewsets.ModelViewSet):
    queryset = Courier.objects.all().order_by('name')
    serializer_class = CourierSerializer

class CourierLogViewSet(viewsets.ModelViewSet):
    queryset = CourierLog.objects.all().order_by('-timestamp')
    serializer_class = CourierLogSerializer

class RestaurantProfileViewSet(viewsets.ModelViewSet):
    queryset = RestaurantProfile.objects.all()
    serializer_class = RestaurantProfileSerializer

