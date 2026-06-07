"""Günlük cron: süresi dolan markaları devre dışı bırakır, yaklaşan süreleri uyarır."""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Brand
from api.plan_limits import GRACE_DAYS, get_plan_status


class Command(BaseCommand):
    help = 'Abonelik süresi dolan markaları işler (grace sonrası devre dışı bırakır).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Değişiklik yapmadan rapor göster.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.localdate()
        grace_cutoff = today - timedelta(days=GRACE_DAYS)

        deactivated = 0
        expiring_soon = 0
        in_grace = 0

        for brand in Brand.objects.all():
            status_info = get_plan_status(brand)
            status = status_info['status']

            if status == 'expiring_soon':
                expiring_soon += 1
                self.stdout.write(
                    f'  ⚠️  {brand.name}: {status_info["days_remaining"]} gün kaldı ({brand.plan})'
                )

            if status == 'grace':
                in_grace += 1
                self.stdout.write(
                    f'  ⏳ {brand.name}: grace dönemi ({status_info["grace_days_remaining"]} gün kaldı)'
                )

            if brand.plan_expiry and brand.plan_expiry < grace_cutoff and brand.is_active:
                if dry_run:
                    self.stdout.write(f'  [dry-run] Devre dışı bırakılacak: {brand.name}')
                else:
                    brand.is_active = False
                    brand.save(update_fields=['is_active'])
                    deactivated += 1
                    self.stdout.write(self.style.WARNING(f'  ✖ {brand.name}: devre dışı bırakıldı'))

        self.stdout.write(self.style.SUCCESS(
            f'\nÖzet: {deactivated} devre dışı, {in_grace} grace, {expiring_soon} yakında dolacak'
        ))
