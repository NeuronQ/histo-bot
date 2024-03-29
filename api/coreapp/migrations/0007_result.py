# Generated by Django 2.1.7 on 2019-06-01 19:16

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('coreapp', '0006_mlmodel_snapshots_json_str'),
    ]

    operations = [
        migrations.CreateModel(
            name='Result',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('counts_json_str', models.TextField(blank=True, default='[]')),
                ('analysis', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='results', to='coreapp.Analysis')),
                ('datasetimage', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='coreapp.DatasetImage')),
                ('labelimage', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='coreapp.LabelImage')),
            ],
            options={
                'ordering': ['created_at'],
                'abstract': False,
            },
        ),
    ]
