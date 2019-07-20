import json
from pathlib import Path

from django.utils.translation import gettext_lazy as _
from django.urls import reverse, re_path, path
from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import mark_safe
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse

import nested_admin

from .models import (
    MLModel,
    Dataset,
    Image,
    LabelImage,
    DatasetImage,
    Analysis,
    Result,
)
from .forms import TrainModelForm, PerformAnalysisForm


User = get_user_model()


admin.site.site_header = "Histo-Bot System Admin"
admin.site.site_title = "Histo-Bot System Admin"
admin.site.index_title = "Histo-Bot to HBot System Admin"


def make_image_field_url(imgf):
    return settings.MEDIA_URL + str(imgf.path).replace(str(Path(settings.MEDIA_ROOT).resolve()), '')[1:]


@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'model_actions')
    fields = (
        'name',
        'labels_json_str',
        'labels_parsed',
        'hparams_json_str',
        'hparams_parsed',
        'training_hparams_json_str',
        'training_hparams_parsed',
        'learner_path',
        'parameters_path',
        # 'snapshots_parsed',
    )
    readonly_fields = (
        'labels',
        'labels_parsed',
        'hparams',
        'hparams_parsed',
        'training_hparams_parsed',
        'snapshots_parsed',
        'model_actions',
    )

    def get_urls(self):
        return [
             path(
                '<path:mlmodel_id>/train/',
                self.admin_site.admin_view(self.process_train),
                name='mlmodel-train',
            ),
           path(
               '<path:mlmodel_id>/analyze/',
               self.admin_site.admin_view(self.process_analyze),
               name='mlmodel-analyze',
           ),
        ] + super().get_urls()

    def process_train(self, request, mlmodel_id, *args, **kwargs):
        return self.process_action(
            request=request,
            mlmodel_id=mlmodel_id,
            action_form=TrainModelForm,
            action_title='Train ML Model',
        )

    def process_analyze(self, request, mlmodel_id, *args, **kwargs):
        return self.process_action(
            request=request,
            mlmodel_id=mlmodel_id,
            action_form=PerformAnalysisForm,
            action_title='Perform Analysis',
        )

    def process_action(self, request, mlmodel_id, action_form, action_title):
        mlmodel = self.get_object(request, mlmodel_id)

        if request.method != 'POST':
            form = action_form()
        else:
            form = action_form(request.POST)
            if form.is_valid():
                try:
                    form.save(mlmodel, request.user)
                except Exception as exc:
                    pass  # bc it was already added to be displayed to user
                else:
                    # TODO: message and redirect based on return from form.save
                    self.message_user(request, 'Success')
                    url = reverse('admin:coreapp_mlmodel_changelist')
                    return HttpResponseRedirect(url)

        context = self.admin_site.each_context(request)
        context['opts'] = self.model._meta
        context['form'] = form
        context['mlmodel'] = mlmodel
        context['title'] = action_title

        return TemplateResponse(
            request,
            'admin/mlmodel/mlmodel_action.html',
            context,
        )

    def model_actions(self, obj):
        return mark_safe(f"""
            <a class="button" href="{reverse('admin:mlmodel-train', args=[obj.pk])}">Train</a>
            <a class="button" href="{reverse('admin:mlmodel-analyze', args=[obj.pk])}">Perform Analysis</a>
        """)

    def hparams_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.hparams_json_str), indent=4)}")

    def labels_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.labels_json_str), indent=4)}")

    def training_hparams_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.training_hparams_json_str), indent=4)}")

    def snapshots_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.snapshots_json_str), indent=4)}")


class DatasetImageInline(nested_admin.NestedTabularInline):
    model = DatasetImage


@admin.register(Dataset)
class DatasetAdmin(nested_admin.NestedModelAdmin):
    inlines = [
        DatasetImageInline
    ]
    list_display = ('name', 'created_at')


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    fields = (
        'name',
        'thumb_img_tag',
        'image',
        'w',
        'h',
    )
    readonly_fields = (
        'thumb_img_tag',
    )
    list_display = (
        'image_url',
        'name',
        'w', 'h',
        'created_at'
    )

    def image_url(self, obj):
        return obj.image.url

    def thumb_img_tag(self, obj):
        return mark_safe(f'<a href="{make_image_field_url(obj.image)}" target="_blank"><img src={obj.image_thumb.url} /></a>')
    thumb_img_tag.short_description = "Thumbnail"


@admin.register(LabelImage)
class LabelImageAdmin(admin.ModelAdmin):
    fields = (
        'name',
        'thumb_img_tag',
        'image',
        'models',
        'w',
        'h',
    )
    readonly_fields = (
        'thumb_img_tag',
    )
    list_display = (
        'image_url',
        'name',
        'used_with_models',
        'w', 'h',
        'created_at'
    )

    def used_with_models(self, obj):
        return ",".join(str(m) for m in obj.models.all())

    def image_url(self, obj):
        return obj.image.url

    def thumb_img_tag(self, obj):
        return mark_safe(f'<a href="{make_image_field_url(obj.image)}" target="_blank"><img src={obj.image_thumb.url} /></a>')
    thumb_img_tag.short_description = "Thumbnail"


class ResultInline(nested_admin.NestedTabularInline):
    model = Result
    fields = ('thumb_img_tag', 'counts_parsed')
    readonly_fields = ('thumb_img_tag', 'counts_parsed')
    extra = 0

    def thumb_img_tag(self, obj):
        return mark_safe(f'<a href="{make_image_field_url(obj.labelimage.image)}" target="_blank"><img src="{obj.labelimage.image_thumb.url}" /></a>')
    thumb_img_tag.short_description = "Thumbnail"

    def counts_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.counts_json_str), indent=4)}")


@admin.register(Analysis)
class AnalysisAdmin(nested_admin.NestedModelAdmin):
    inlines = (ResultInline,)
    list_display = ('__str__', 'created_at')
    fields = (
        'name',
        'created_at',
        'model',
        'datasets',
        'count_labels_parsed'
    )
    readonly_fields = (
        'created_at',
        'count_labels_parsed'
    )

    def count_labels_parsed(self, obj):
        return mark_safe(f"<pre>{json.dumps(json.loads(obj.count_labels_json_str), indent=4)}")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
                                       'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
    list_display = (
        'email',
        'is_staff',
        'is_superuser'
    )
    ordering = ('email',)
