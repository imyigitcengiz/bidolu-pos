# Branch-level data isolation

from django.db import migrations, models
import django.db.models.deletion


def assign_branches_to_existing_data(apps, schema_editor):
    Branch = apps.get_model('api', 'Branch')
    Table = apps.get_model('api', 'Table')
    Order = apps.get_model('api', 'Order')
    CashRegister = apps.get_model('api', 'CashRegister')
    Brand = apps.get_model('api', 'Brand')

    for brand in Brand.objects.all():
        first_branch = Branch.objects.filter(brand_id=brand.id).order_by('id').first()
        if not first_branch:
            continue
        Table.objects.filter(brand_id=brand.id, branch__isnull=True).update(branch_id=first_branch.id)
        Order.objects.filter(brand_id=brand.id, branch__isnull=True).update(branch_id=first_branch.id)
        CashRegister.objects.filter(brand_id=brand.id, branch__isnull=True).update(branch_id=first_branch.id)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_branch_franchise_panel'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='table',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='table',
            name='branch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='tables', to='api.branch'),
        ),
        migrations.AddField(
            model_name='order',
            name='branch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='api.branch'),
        ),
        migrations.AddField(
            model_name='cashregister',
            name='branch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cash_registers', to='api.branch'),
        ),
        migrations.RunPython(assign_branches_to_existing_data, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='table',
            unique_together={('brand', 'branch', 'name')},
        ),
    ]
