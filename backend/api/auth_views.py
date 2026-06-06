from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import UserProfile


# ─── LOGIN ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response({'error': 'Kullanıcı adı ve şifre gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if user is None:
        return Response({'error': 'Geçersiz kullanıcı adı veya şifre.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'error': 'Bu hesap devre dışı bırakılmış.'}, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=user)
    profile, _ = UserProfile.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': _serialize_user(user, profile),
    })


# ─── REGISTER (only super_admin can create users) ─────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_view(request):
    # Only super_admin can register new users
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yalnızca Süper Yönetici yeni kullanıcı oluşturabilir.'}, status=status.HTTP_403_FORBIDDEN)

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    role = request.data.get('role', 'staff')
    phone = request.data.get('phone', '').strip()

    if not username or not password:
        return Response({'error': 'Kullanıcı adı ve şifre gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Bu kullanıcı adı zaten kullanılıyor.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.phone = phone
    profile.save()

    return Response({
        'user': _serialize_user(user, profile),
    }, status=status.HTTP_201_CREATED)


# ─── LOGOUT ────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Başarıyla çıkış yapıldı.'})


# ─── ME (get/update profile) ──────────────────────────
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response({'user': _serialize_user(user, profile)})

    # PATCH — update profile
    data = request.data

    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        user.email = data['email']

    # Password change
    if 'new_password' in data and data['new_password']:
        old_password = data.get('old_password', '')
        if not user.check_password(old_password):
            return Response({'error': 'Mevcut şifre yanlış.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(data['new_password'])

    user.save()

    if 'phone' in data:
        profile.phone = data['phone']
    if 'role' in data:
        # Only super_admin can change roles
        caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if caller_profile.role == 'super_admin':
            profile.role = data['role']

    # Handle avatar upload
    if 'avatar' in request.FILES:
        profile.avatar = request.FILES['avatar']

    profile.save()

    return Response({'user': _serialize_user(user, profile)})


# ─── USER LIST (super admin only) ─────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list_view(request):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by('-date_joined')
    result = []
    for u in users:
        profile, _ = UserProfile.objects.get_or_create(user=u)
        result.append(_serialize_user(u, profile))

    return Response(result)


# ─── USER DETAIL (super admin: edit/delete) ───────────
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail_view(request, user_id):
    caller_profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if caller_profile.role != 'super_admin':
        return Response({'error': 'Yetkisiz erişim.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Kullanıcı bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if target_user.id == request.user.id:
            return Response({'error': 'Kendinizi silemezsiniz.'}, status=status.HTTP_400_BAD_REQUEST)
        target_user.delete()
        return Response({'message': 'Kullanıcı silindi.'})

    # PATCH
    data = request.data
    profile, _ = UserProfile.objects.get_or_create(user=target_user)

    if 'first_name' in data:
        target_user.first_name = data['first_name']
    if 'last_name' in data:
        target_user.last_name = data['last_name']
    if 'email' in data:
        target_user.email = data['email']
    if 'is_active' in data:
        target_user.is_active = data['is_active']
    if 'password' in data and data['password']:
        target_user.set_password(data['password'])

    target_user.save()

    if 'role' in data:
        profile.role = data['role']
    if 'phone' in data:
        profile.phone = data['phone']
    profile.save()

    return Response({'user': _serialize_user(target_user, profile)})


# ─── SEED SUPER ADMIN ─────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def seed_super_admin(request):
    """Create default super admin if no users exist"""
    if User.objects.exists():
        return Response({'error': 'Sistemde zaten kullanıcılar mevcut.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_superuser(
        username='admin',
        password='admin123',
        email='admin@bidolupos.com',
        first_name='Süper',
        last_name='Yönetici',
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = 'super_admin'
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'message': 'Varsayılan süper yönetici oluşturuldu.',
        'credentials': {
            'username': 'admin',
            'password': 'admin123',
        },
        'token': token.key,
        'user': _serialize_user(user, profile),
    }, status=status.HTTP_201_CREATED)


# ─── HELPERS ───────────────────────────────────────────
def _serialize_user(user, profile):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_active': user.is_active,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined.isoformat(),
        'role': profile.role,
        'role_display': profile.get_role_display(),
        'phone': profile.phone or '',
        'avatar': profile.avatar.url if profile.avatar else None,
    }
