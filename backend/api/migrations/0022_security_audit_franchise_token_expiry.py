from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone
from datetime import timedelta


def set_token_expiry(apps, schema_editor):
    FranchisePanelToken = apps.get_model('api', 'FranchisePanelToken')
    default_expiry = timezone.now() + timedelta(days=7)
    FranchisePanelToken.objects.filter(expires_at__isnull=True).update(expires_at=default_expiry)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0021_orderchannel_brand'),
    ]

    operations = [
        migrations.AddField(
            model_name='franchisepaneltoken',
            name='expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('impersonate', 'Hesaba Gir'), ('brand_enter', 'Mağazaya Gir')], max_length=30)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_actions', to=settings.AUTH_USER_MODEL)),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_targets', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.RunPython(set_token_expiry, migrations.RunPython.noop),
    ]
