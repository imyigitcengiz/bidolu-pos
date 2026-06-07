# BiDoluPos

Çok kiracılı (multi-tenant) restoran POS SaaS platformu — Django backend + React/Vite frontend.

## Hızlı başlangıç (geliştirme)

```bash
bash start.sh
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

`start.sh` otomatik olarak `DJANGO_DEBUG=True` ve migration çalıştırır.

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın.

| Değişken | Açıklama |
|----------|----------|
| `DJANGO_SECRET_KEY` | **Zorunlu** (production) |
| `DJANGO_DEBUG` | `False` production, `True` geliştirme |
| `DJANGO_ALLOWED_HOSTS` | Virgülle ayrılmış host listesi |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Frontend origin whitelist |
| `PAYMENT_PROVIDER` | `auto`, `stripe`, `iyzico`, `mock` (mock yalnızca DEBUG) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe ödeme |
| `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` | iyzico ödeme |
| `FRONTEND_URL` / `BACKEND_URL` | Ödeme callback URL'leri |
| `SEED_ADMIN_SECRET` | İlk süper admin seed (production) |

## Docker

```bash
docker compose up --build
```

Ödeme değişkenleri `docker-compose.yml` üzerinden `.env` ile aktarılır.

## Abonelik cron

Günlük plan süresi kontrolü:

```bash
python manage.py check_plan_expiry
# Önizleme: python manage.py check_plan_expiry --dry-run
```

Örnek crontab (her gün 03:00):

```
0 3 * * * cd /path/to/BiDoluPos/backend && ./venv/bin/python manage.py check_plan_expiry
```

## Ödeme webhook URL'leri

- Stripe: `POST https://your-domain/api/payments/stripe/webhook/`
- iyzico callback: `POST https://your-domain/api/payments/iyzico/callback/`
- Stripe success verify: `GET /api/payments/stripe/verify/?session_id=...`

## Production güvenlik checklist

- [ ] `DJANGO_DEBUG=False`
- [ ] Güçlü `DJANGO_SECRET_KEY` tanımlı
- [ ] `DJANGO_ALLOWED_HOSTS` ve `DJANGO_CORS_ALLOWED_ORIGINS` kısıtlı
- [ ] `PAYMENT_PROVIDER=auto` + Stripe veya iyzico anahtarları
- [ ] Mock ödeme kapalı (DEBUG=False otomatik)
- [ ] `check_plan_expiry` cron aktif
- [ ] HTTPS reverse proxy (`X-Forwarded-Proto`)
- [ ] `SEED_ADMIN_SECRET` yalnızca ilk kurulumda

## Test

```bash
cd backend
source venv/bin/activate
export DJANGO_DEBUG=True DJANGO_SECRET_KEY=test-key
python manage.py test api.tests -v 2
```

## Mimari özet

| Katman | Rol |
|--------|-----|
| `super_admin` | Platform yönetimi |
| `store_owner` | Kurum / marka yöneticisi |
| Staff rolleri | Operasyon (garson, mutfak, vb.) |
| Franchise panel | Harici şube girişi (token) |

Plan limitleri: `backend/api/plan_limits.py`  
Tenant izolasyonu: `filter_by_brand`, `filter_by_tenant`, `tenant_helpers.py`

## Şube seçici (ana panel)

Çok şubeli markalarda üst çubuktaki **şube seçici** ile `?branch_id=` filtresi tüm operasyonel API çağrılarına otomatik eklenir (`apiClient.js`). "Tüm Şubeler" seçiliyken marka genelinde veri görünür.

## Franchise panel operasyonları

`/franchise?code=ERISIM_KODU` — şube personeli erişim kodu + panel şifresi ile giriş yapar.

| Endpoint | İşlev |
|----------|--------|
| `GET /api/franchise/tables/` | Şube masaları |
| `POST /api/franchise/orders/` | Sipariş oluştur / ürün ekle |
| `GET /api/franchise/orders/<id>/` | Sipariş detayı |
| `POST /api/franchise/orders/<id>/pay_and_close/` | Ödeme al, masayı kapat |
| `POST /api/franchise/tables/<id>/change_status/` | Masa durumu |
| `GET /api/franchise/menu/` | Marka menüsü |

Kurum yöneticisi şifreyi **Franchise Merkezi** → şube → panel erişimi üzerinden belirler (min. 10 karakter).
