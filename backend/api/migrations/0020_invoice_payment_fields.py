from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_branch_data_isolation'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='checkout_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='external_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='paid_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='invoice',
            name='payment_provider',
            field=models.CharField(
                choices=[('mock', 'Mock'), ('stripe', 'Stripe'), ('iyzico', 'iyzico')],
                default='mock',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Bekliyor'),
                    ('paid', 'Ödendi'),
                    ('failed', 'Başarısız'),
                    ('cancelled', 'İptal'),
                ],
                default='paid',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='invoice',
            name='paid',
            field=models.BooleanField(default=False),
        ),
    ]
