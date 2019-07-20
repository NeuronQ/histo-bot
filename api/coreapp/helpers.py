from collections import OrderedDict
import re

from django.db import models
from django.utils import timezone
from django.utils.text import camel_case_to_spaces
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import APIException

from utils.utils import ifnone


def get_model_fields(model_class):
    field_names = []
    for fld in model_class._meta.get_fields():
        fld_name = fld.name
        if (
            isinstance(fld, models.ManyToManyRel) or
            isinstance(fld, models.ManyToOneRel)
        ):
            continue
        if (
            isinstance(fld, models.fields.related.ForeignKey) or
            isinstance(fld, models.OneToOneRel)
        ):
            fld_name += '_id'
        field_names.append(fld_name)
    return field_names


def make_model_serializer_class(model_class, fields='__all__'):
    cls_body = dict()
    if fields == '__all__':
        fields = get_model_fields(model_class)
    for fld_name in fields:
        if re.search(r"_id$", fld_name):
            cls_body[fld_name] = serializers.IntegerField(required=False)
    cls_body['Meta'] = type('Meta', (), dict(model=model_class, fields=fields))
    return type(
        f"{model_class.__name__}Serializer",
        (serializers.ModelSerializer,),
        cls_body
    )


def make_model_viewset_class(
    model_class, serializer_class, *, permissions=None, queryset=None
):
    return type(
        f"{model_class.__name__}ViewSet",
        (viewsets.ModelViewSet,),
        dict(
            model=model_class,
            permission_classes=ifnone(permissions, (IsAuthenticated,)),
            queryset=ifnone(queryset, model_class.objects.all()),
            serializer_class=serializer_class
        )
    )


def make_model_serializer_viewset(
        model_class, *, fields='__all__', permissions=None, queryset=None
):
    serializer_class = make_model_serializer_class(model_class, fields)

    viewset_class = make_model_viewset_class(
        model_class, serializer_class, permissions=permissions, queryset=queryset)

    return serializer_class, viewset_class


class LockableModel(models.Model):
    LOCK_NONE = 0  # 000 - no lock
    LOCK_CHANGE = 1  # 001 - change fields lock
    LOCK_ADD = 2  # 010 - add children lock
    LOCK_STATUS = 4  # 100 - lock changing status field
    LOCK_ALL = LOCK_CHANGE | LOCK_ADD | LOCK_STATUS  # 111 - lock all

    class Meta:
        abstract = True

    locked = models.IntegerField(default=LOCK_NONE)


class NestedWritableFieldsSerializerMixin:

    """Mechanism for nestable writable fields.

    Goals: DRY, explicit, debuggable, easily extendable!
    """
    was_changed = False

    class Meta:
        # expect nested_fields : {field_name: {serializer, *parent_field_name}}
        # (just use an OrderedDict here if order matters)
        nested_fields = {}

    def validate(self, data):
        for field_name in self.Meta.nested_fields.keys():
            ids = set()
            for it in data.get(field_name, []):
                if 'id' not in it:
                    continue
                if it['id'] in ids:
                    raise serializers.ValidationError('duplicate {} id: {}'.format(field_name,
                                                                                   it['id']))
                ids.add(it['id'])
        return data

    def create(self, validated_data):
        nested_data = self._extract_nested_data(validated_data)

        # default create
        obj = super().create(validated_data)

        # handle nested objects
        for field_name, nested_items_data in nested_data.items():
            if nested_items_data is None:
                continue
            for item_data in nested_items_data:
                parent_field_name = self.Meta.nested_fields[field_name].get(
                    'parent_field_name', self._guess_parent_ref_field_name())
                item_data[parent_field_name] = obj.id
                serializer_class = self.Meta.nested_fields[field_name]['serializer']
                serializer = serializer_class(data=item_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()

        return obj

    def update(self, obj, validated_data):
        nested_data = self._extract_nested_data(validated_data)

        # locking
        locked = getattr(self, 'locked', LockableModel.LOCK_NONE)

        # change tracking
        changed_fields = self.has_changes(obj, validated_data)
        if changed_fields:
            # locking
            if (
                (locked & LockableModel.LOCK_CHANGE) and
                not self._can_update_when_locked(changed_fields)
            ):
                raise APIException(
                    'not allowed to update fields %s of %s %d' % (
                        ", ".join(changed_fields),
                        obj.__class__.__name__,
                        obj.id
                    ),
                    code=403)
            self.was_changed = True

        # default update
        super().update(obj, validated_data)

        # handle nested objects
        for field_name, nested_items_data in nested_data.items():
            if nested_items_data is None:
                continue

            # locking
            if locked & LockableModel.LOCK_ADD:
                raise APIException('action not allowed', code=403)

            # delete items not present
            items_to_delete = getattr(obj, field_name).exclude(
                id__in=(item_data['id']
                        for item_data in nested_items_data
                        if 'id' in item_data)
            )

            # DEBUG
            # print("--- items_to_delete:", items_to_delete)
            # print("--- nested_items_data:", nested_items_data)
            # print("--- nested_data:", dict(nested_data))
            # return obj

            if items_to_delete.count():
                self.was_changed = True  # change tracking
                items_to_delete.delete()

            for item_data in nested_items_data:
                serializer_class = self.Meta.nested_fields[field_name]['serializer']
                model_class = serializer_class.Meta.model
                # update for those with id
                if 'id' in item_data:
                    child_obj = model_class.objects.get(id=item_data['id'])
                    serializer = serializer_class(
                        child_obj,
                        item_data,
                        partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    if serializer.was_changed:
                        self.was_changed = True  # change tracking
                # crate those without id
                else:
                    parent_field_name = self.Meta.nested_fields[field_name].get(
                        'parent_field_name', self._guess_parent_ref_field_name())
                    item_data[parent_field_name] = obj.id
                    serializer = serializer_class(data=item_data)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    self.was_changed = True

        # DEBUG
        # print("\n--- WAS CHANGED #{}: {}\n".format(obj.id, self.was_changed))

        if self.was_changed:  # change tracking
            obj.updated_at = timezone.now()
            obj.save()

        return obj

    def has_changes(self, obj, validated_data):
        skip_diff_fields = getattr(self.Meta, 'skip_diff_fields', set()).union(
            {'updated_at', 'created_at', 'reviewed_at', 'approved_at'}
        )
        changed_fieds = set()
        for field, value in validated_data.items():
            if field in skip_diff_fields:
                continue
            if field == 'status' and not value:
                continue
            if getattr(obj, field) != value:
                # DEBUG
                # print("\n=== {} (old) != {} (new) at {}".format(
                #     getattr(obj, field), value, field,
                # ))
                changed_fieds.add(field)
        return changed_fieds

    def _extract_nested_data(self, validated_data):
        """Extract nested data first so it doesn't break the regular process
        """
        nested_data = OrderedDict()
        for field_name in self.Meta.nested_fields.keys():
            nested_data[field_name] = validated_data.pop(field_name, None)
        return nested_data

    def _guess_parent_ref_field_name(self):
        """Hacky way to "guess" parent class-referencing field name
        """
        parent_field_name = (
            camel_case_to_spaces(self.Meta.model.__name__).replace(' ', '_') +
            '_id')
        return parent_field_name

    def _can_update_when_locked(self, fields):
        return getattr(self.Meta, 'update_when_locked', ()).issuperset(fields)
