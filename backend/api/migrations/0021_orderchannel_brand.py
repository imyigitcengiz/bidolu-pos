from django.db import migrations, models
import django.db.models.deletion


def assign_order_channels_to_brands(apps, schema_editor):
    OrderChannel = apps.get_model('api', 'OrderChannel')
    Brand = apps.get_model('api', 'Brand')
    first_brand = Brand.objects.order_by('id').first()
    if first_brand:
        OrderChannel.objects.filter(brand__isnull=True).update(brand_id=first_brand.id)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_invoice_payment_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orderchannel',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='orderchannel',
            name='brand',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='order_channels',
                to='api.brand',
            ),
        ),
        migrations.RunPython(assign_order_channels_to_brands, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='orderchannel',
            unique_together={('brand', 'name')},
        ),
    ]
