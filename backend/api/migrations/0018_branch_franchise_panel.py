# Generated manually for franchise panel feature

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_alter_staffmember_role_alter_userprofile_role_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='branch',
            name='panel_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='branch',
            name='panel_password',
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name='branch',
            name='panel_password_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='branch',
            name='panel_slug',
            field=models.SlugField(blank=True, max_length=80, null=True, unique=True),
        ),
        migrations.AlterUniqueTogether(
            name='branch',
            unique_together={('brand', 'name')},
        ),
        migrations.CreateModel(
            name='FranchisePanelToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=40, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('branch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='panel_tokens', to='api.branch')),
            ],
        ),
    ]
