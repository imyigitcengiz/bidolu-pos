from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from .models import (
    Table, Category, MenuItem, MenuItemModifier, Order, OrderItem, Payment,
    OrderChannel, CashRegister, Ingredient, Recipe, RecipeIngredient,
    StaffMember, Expense, Courier, CourierLog, RestaurantProfile,
    CashTransaction, StockAudit, StockAuditItem, Customer, WhatsAppConfig,
)
from .serializers import (
    TableSerializer, CategorySerializer, MenuItemSerializer, MenuItemModifierSerializer,
    OrderSerializer, OrderItemSerializer, PaymentSerializer,
    OrderChannelSerializer, CashRegisterSerializer, IngredientSerializer,
    RecipeSerializer, RecipeIngredientSerializer, StaffMemberSerializer,
    ExpenseSerializer, CourierSerializer, CourierLogSerializer,
    RestaurantProfileSerializer, CashTransactionSerializer, StockAuditSerializer,
    CustomerSerializer, WhatsAppConfigSerializer,
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
            modifier_text = item.get('modifier_text', '')
            modifier_extra = float(item.get('modifier_extra', 0))
            price = float(menu_item.price) + modifier_extra
            
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                price=price,
                note=note,
                modifier_text=modifier_text,
                modifier_extra=modifier_extra,
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
        
        try:
            amount_decimal = float(amount)
        except ValueError:
            return Response({'error': 'Geçersiz tutar'}, status=status.HTTP_400_BAD_REQUEST)

        # Atomically record payment, register transaction, update order/table
        with transaction.atomic():
            # Record payment
            Payment.objects.create(
                order=order,
                amount=amount_decimal,
                payment_method=payment_method
            )
            
            # Update order status to completed
            order.status = 'completed'
            order.save()
            
            # Empty the table
            table = order.table
            table.status = 'empty'
            table.save()

            # Record in Cash Register
            register = CashRegister.objects.first()
            if not register:
                register = CashRegister.objects.create(name='Ana Kasa', balance=0.00, location='Merkez')
            
            # Log CashTransaction (which will automatically increment the register balance!)
            CashTransaction.objects.create(
                register=register,
                transaction_type='in',
                amount=amount_decimal,
                description=f"Masa Ödemesi ({table.name}) - Sipariş #{order.id} ({payment_method == 'cash' and 'Nakit' or 'Kredi Kartı'})"
            )
        
        # Check WhatsApp Auto Message
        whatsapp_simulated = None
        try:
            profile = RestaurantProfile.objects.first()
            if profile and profile.ext_whatsapp_enabled:
                wa_config = WhatsAppConfig.objects.first()
                if wa_config and wa_config.is_auto_message_enabled:
                    # Select a customer (either first customer or mock name)
                    customer = Customer.objects.first()
                    cust_name = customer.name if customer else "Değerli Müşterimiz"
                    cust_phone = customer.phone if customer else "0555 555 55 55"
                    
                    msg = wa_config.message_template.replace('{customer_name}', cust_name).replace('{order_id}', str(order.id))
                    
                    print(f"\n--- [WHATSAPP AUTO MESSAGE SIMULATION] ---")
                    print(f"To: {cust_name} ({cust_phone})")
                    print(f"Message: {msg}")
                    print(f"-------------------------------------------\n")
                    
                    whatsapp_simulated = {
                        'to': f"{cust_name} ({cust_phone})",
                        'message': msg
                    }
        except Exception as e:
            print(f"WhatsApp auto message error: {e}")
        
        return Response({
            'message': 'Ödeme alındı ve masa kapatıldı',
            'order': OrderSerializer(order).data,
            'whatsapp_simulated': whatsapp_simulated
        })

    @action(detail=True, methods=['post'])
    def apply_discount(self, request, pk=None):
        """Apply or remove discount on an active order."""
        order = self.get_object()
        if order.status in ['completed', 'cancelled']:
            return Response({'error': 'Tamamlanmış sipairişe indirim uygulanamaz'}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = request.data.get('discount_type', 'none')
        discount_value = float(request.data.get('discount_value', 0))
        discount_reason = request.data.get('discount_reason', '')

        if discount_type not in ['none', 'percent', 'fixed']:
            return Response({'error': 'Geçersiz indirim tipi'}, status=status.HTTP_400_BAD_REQUEST)
        if discount_type == 'percent' and not (0 <= discount_value <= 100):
            return Response({'error': 'Yüzde 0-100 arasında olmalıdır'}, status=status.HTTP_400_BAD_REQUEST)

        order.discount_type = discount_type
        order.discount_value = discount_value
        order.discount_reason = discount_reason
        order.save()
        return Response(OrderSerializer(order).data)

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

    def perform_create(self, serializer):
        with transaction.atomic():
            expense = serializer.save()
            
            # Find default cash register
            register = CashRegister.objects.first()
            if not register:
                register = CashRegister.objects.create(name='Ana Kasa', balance=0.00, location='Merkez')
            
            # Log CashTransaction (which will automatically deduct the register balance!)
            CashTransaction.objects.create(
                register=register,
                transaction_type='out',
                amount=expense.amount,
                description=f"Gider: {expense.title} ({expense.category or 'Genel'})"
            )

class CashTransactionViewSet(viewsets.ModelViewSet):
    queryset = CashTransaction.objects.all().order_by('-id')
    serializer_class = CashTransactionSerializer

    def get_queryset(self):
        queryset = CashTransaction.objects.all().order_by('-id')
        register_id = self.request.query_params.get('register', None)
        if register_id is not None:
            queryset = queryset.filter(register_id=register_id)
        return queryset

class StockAuditViewSet(viewsets.ModelViewSet):
    queryset = StockAudit.objects.all().order_by('-date')
    serializer_class = StockAuditSerializer

    def create(self, request, *args, **kwargs):
        items_data = request.data.get('items', [])
        notes = request.data.get('notes', '')

        if not items_data:
            return Response({'error': 'Sayım yapılacak malzeme bulunamadı'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                audit = StockAudit.objects.create(notes=notes, total_variance_amount=0)
                total_variance = 0

                for item in items_data:
                    ing_id = item.get('ingredient')
                    actual_stock = float(item.get('actual_stock', 0))

                    try:
                        ingredient = Ingredient.objects.get(id=ing_id)
                    except Ingredient.DoesNotExist:
                        continue

                    system_stock = float(ingredient.stock_quantity)
                    variance = actual_stock - system_stock
                    unit_price = float(ingredient.unit_price)
                    cost_difference = variance * unit_price

                    # Save Audit Item
                    StockAuditItem.objects.create(
                        audit=audit,
                        ingredient=ingredient,
                        system_stock=system_stock,
                        actual_stock=actual_stock,
                        variance=variance,
                        unit_price=unit_price,
                        cost_difference=cost_difference
                    )

                    # Update ingredient stock quantity in database
                    ingredient.stock_quantity = actual_stock
                    ingredient.save()

                    total_variance += cost_difference

                # Save the total variance on audit
                audit.total_variance_amount = total_variance
                audit.save()

            return Response(StockAuditSerializer(audit).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CourierViewSet(viewsets.ModelViewSet):
    queryset = Courier.objects.all().order_by('name')
    serializer_class = CourierSerializer

class CourierLogViewSet(viewsets.ModelViewSet):
    queryset = CourierLog.objects.all().order_by('-timestamp')
    serializer_class = CourierLogSerializer

class RestaurantProfileViewSet(viewsets.ModelViewSet):
    queryset = RestaurantProfile.objects.all()
    serializer_class = RestaurantProfileSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer

class WhatsAppConfigViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppConfig.objects.all().order_by('-id')
    serializer_class = WhatsAppConfigSerializer

    @action(detail=False, methods=['post'])
    def send_campaign(self, request):
        message = request.data.get('message', '')
        recipients = request.data.get('recipients', [])
        
        if not message or not recipients:
            return Response({'error': 'Mesaj ve alıcı listesi gereklidir'}, status=status.HTTP_400_BAD_REQUEST)
        
        logs = []
        for index, r in enumerate(recipients):
            logs.append({
                'id': index + 1,
                'customer': r.get('name'),
                'phone': r.get('phone'),
                'status': 'Gönderildi',
                'message_preview': message.replace('{customer_name}', r.get('name', 'Müşteri'))
            })
        
        return Response({
            'status': 'success',
            'message': f'{len(recipients)} müşteriye kampanya gönderimi simüle edildi.',
            'logs': logs
        })

class MenuItemModifierViewSet(viewsets.ModelViewSet):
    queryset = MenuItemModifier.objects.all().order_by('id')
    serializer_class = MenuItemModifierSerializer

    def get_queryset(self):
        queryset = MenuItemModifier.objects.all().order_by('id')
        menu_item_id = self.request.query_params.get('menu_item', None)
        if menu_item_id is not None:
            queryset = queryset.filter(menu_item_id=menu_item_id)
        return queryset

class LowStockView(views.APIView):
    """Returns all ingredients where stock_quantity <= minimum_stock (and minimum_stock > 0)."""
    def get(self, request):
        low = Ingredient.objects.filter(
            minimum_stock__gt=0,
            stock_quantity__lte=F('minimum_stock')
        ).order_by('name')
        from .serializers import IngredientSerializer
        data = IngredientSerializer(low, many=True).data
        return Response({
            'count': low.count(),
            'items': data
        })

