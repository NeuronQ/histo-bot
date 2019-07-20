# from collections import defaultdict
import datetime
import json
import logging
import os
# import re
import time
import uuid
from functools import partial
from pathlib import Path

# from django.conf import settings
from django.db import models as m
from django.contrib.auth.models import AbstractUser, UserManager as DefaultUserManager
from django.utils.translation import ugettext_lazy as _

# from PIL import Image as PILImage
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill, ResizeToFit

# from utils.utils import ifnone
import ml.api as ML


log = logging.getLogger(__name__)


class TimestampedModel(m.Model):
    class Meta:
        abstract = True
        ordering = ["created_at"]

    created_at = m.DateTimeField(db_index=True, auto_now_add=True)
    updated_at = m.DateTimeField(auto_now=True)


# class ClonableMixin(object):
#     """
#     Any clonable model is expected to have some utility functions, but we
#     leave the actual cloning logic to particular model classes since this
#     is likely to be custom with respect to related objects.

#     EXPECTATIONS:
#         - subclass of models.Model
#     """

#     def get_clean_data(self, skip=set()):
#         return {
#             k: v for k, v in self.__dict__.items()
#             if k[0] != '_' and k not in skip
#         }

#     def clone(self, update={}):
#         clone_data = self.get_clean_data(skip={'id'})
#         clone_data.update(update)
#         return self.__class__.objects.create(**clone_data)


# class ModificationLoggedModel(m.Model):
#     class Meta:
#         abstract = True

#     created_by = m.ForeignKey('User', on_delete=m.SET_NULL, null=True, blank=True)
#     updated_by = m.ForeignKey('User', on_delete=m.SET_NULL, null=True, blank=True)
#     deleted_by = m.ForeignKey('User', on_delete=m.SET_NULL, null=True, blank=True)


# Core Business Logic Models
#####################################################################

MAX_FS_PATH_LEN = 4096


class MLModel(TimestampedModel, m.Model):
    class Meta:
        verbose_name_plural = "ML-Models"

    name = m.CharField(max_length=255, unique=True)
    learner_path = m.CharField(max_length=MAX_FS_PATH_LEN, blank=True)
    parameters_path = m.CharField(max_length=MAX_FS_PATH_LEN, blank=True)

    labels_json_str = m.TextField(blank=True, default="[]")
    @property
    def labels(self):
        return json.loads(self.labels_json_str)
    @labels.setter
    def labels(self, val):
        self.labels_json_str = json.dumps(val)

    hparams_json_str = m.TextField(
        blank=True,
        default="{}",
    )
    @property
    def hparams(self):
        return json.loads(self.hparams_json_str)
    @hparams.setter
    def hparams(self, val):
        self.hparams_json_str = json.dumps(val)

    training_hparams_json_str = m.TextField(blank=True, default="{}")
    @property
    def training_hparams(self):
        return json.loads(self.training_hparams_json_str)
    @training_hparams.setter
    def training_hparams(self, val):
        self.training_hparams_json_str = json.dumps(val)

    snapshots_json_str = m.TextField(blank=True, default="[]")
    @property
    def snapshots(self):
        return json.loads(self.snapshots_json_str)
    @snapshots.setter
    def snapshots(self, val):
        self.snapshots_json_str = json.dumps(val)

    def train(self, dataset_ids, training_hparams=None, on_epoch_done=None, on_final_epoch_done=None, _fake=False):
        train_with_hparams = self.training_hparams.copy()
        if training_hparams:
            train_with_hparams.update(training_hparams)

        image_paths, label_paths = [], []
        # import pdb; pdb.set_trace()
        datasets = Dataset.objects.filter(id__in=dataset_ids)
        assert len(datasets)
        for ds in datasets:
            ipaths, lpaths = ds.get_image_and_label_paths()
            image_paths.extend(ipaths)
            label_paths.extend(lpaths)

        if _fake:  # to test FE & BE in isolation from ML
            for i in range(train_with_hparams['epochs']):
                print(f"~ FAKE training epoch #{i} ~")
                time.sleep(1)
                if on_epoch_done:
                    print("-<on_epoch_done>-")
                    on_epoch_done(i)
            return {}

        self.save_snapshot(trained_with_hparams=train_with_hparams)

        tres = ML.train_and_predict(
            labels=self.labels,
            image_paths=image_paths,
            label_paths=label_paths,
            model_hparams=self.hparams,
            training_hparams=train_with_hparams,
            parameters_path=Path(self.parameters_path) if self.parameters_path else None,
            on_epoch_done=on_epoch_done,
            on_final_epoch_done=on_final_epoch_done,
            save_learner=True,
            save_parameters=True,
            save_results=True,
        )

        self.learner_path = str(tres['new_learner_path'])
        self.parameters_path = str(tres['new_parameters_path'])
        self.save()

        return tres

    def analyze(self, datasets, count_labels=None):
        image_paths = []
        for ds in datasets:
            image_paths.extend(ds.get_image_paths())

        pres = ML.predict(
            Path(self.learner_path),
            self.labels,
            image_paths,
            save=True
        )

        res = {'labels': {
            str(image_path): (str(raw_result_path), str(nice_result_path))
            for image_path, (raw_result_path, nice_result_path) in pres.items()
        }}

        if count_labels:
            labels_with_count_params = self.labels.copy()
            for lbl in labels_with_count_params:
                if lbl['label'] in count_labels:
                    lbl.update(count_labels[lbl['label']])
                    lbl['count'] = True
                else:
                    lbl['count'] = False
            counts = {}
            for image_path, (raw_result_path, _) in pres.items():
                counts[str(image_path)] = ML.count_patches(raw_result_path, labels_with_count_params)
            res['counts'] = counts

        return res

    def make_snapshot(self, **extra_data):
        now = datetime.datetime.now()
        now_ts = time.mktime(now.timetuple())
        return {
            'at': f"{now.strftime('%Y-%m-%d-%H:%M')}-{int(now_ts)}",
            'name': self.name,
            'learner_path': self.learner_path,
            'parameters_path': self.parameters_path,
            'labels': self.labels,
            'hparams': self.hparams,
            'training_hparams': self.training_hparams,
            **extra_data,
        }

    def save_snapshot(self, **extra_data):
        snapshots = self.snapshots or []
        snapshots.append(self.make_snapshot(**extra_data))
        self.snapshots = snapshots
        self.save()

    def delete_snapshot(self, at):
        s = [s for s in self.snapshots if s['at'] == at][0]
        learner_path = s.get('learner_path', None)
        if learner_path and os.path.exists(learner_path):
            os.unlink(learner_path)
        parameters_path = s.get('parameters_path', None)
        if parameters_path and os.path.exists(parameters_path):
            os.unlink(parameters_path)
        self.snapshots = [s for s in self.snapshots if s['at'] != at]
        self.save()

    def __str__(self):
        return self.name


class Dataset(TimestampedModel, m.Model):
    images = m.ManyToManyField("Image", through="DatasetImage")

    name = m.CharField(max_length=255)

    def get_image_and_label_paths(self):
        image_paths = []
        label_paths = []
        for dsi in self.datasetimages.all():
            image_paths.append(Path(dsi.image.image.path))
            label_paths.append(Path(dsi.label_image.image.path))
        return image_paths, label_paths

    def get_image_paths(self):
        return [Path(dsi.image.image.path) for dsi in self.datasetimages.all()]

    def get_label_paths(self):
        return [Path(dsi.label_image.image.path) for dsi in self.datasetimages.all()]

    def __str__(self):
        return self.name


def make_image_filepath(instance, filename, prefix):
    path, ext = os.path.splitext(filename)
    return os.path.join(prefix, uuid.uuid4().hex + ext)


class BaseImage(TimestampedModel, m.Model):
    class Meta:
        abstract = True

    SIZE_THUMB = (250, 250)
    SIZE_WEB = (2880, 2880)

    w = m.IntegerField(null=True, blank=True)
    h = m.IntegerField(null=True, blank=True)

    name = m.CharField(max_length=255, blank=True, default="")

    image_thumb = ImageSpecField(
        source="image",
        processors=[ResizeToFill(*SIZE_THUMB)],
        format="JPEG",
        options={"quality": 80},
    )

    image_websize = ImageSpecField(
        source="image",
        processors=[ResizeToFit(*SIZE_WEB)],
        format="JPEG",
        options={"quality": 90},
    )

    @property
    def summary(self):
        res = {
            "image": self.image.url if self.image else None,
            "image_w": self.w,
            "image_h": self.h,
            "thumb": self.image_thumb.url if self.image_thumb else None,
            "thumb_w": self.SIZE_THUMB[0],
            "thumb_h": self.SIZE_THUMB[1],
            "websize": self.image_websize.url if self.image_websize else None,
            "websize_w": self.SIZE_WEB[0],
            "websize_h": self.SIZE_WEB[1],
        }
        return res

    @staticmethod
    def post_delete_remove_file(sender, instance, **kwargs):
        for image in (instance.image, instance.image_thumb, instance.image_websize):
            try:
                if image and image.file:
                    os.remove(str(image.file))
            except Exception as exc:
                log.error(
                    f'Error deleting file for {instance}'
                )


class Image(BaseImage):
    FULLSIZE_IMAGES_DIR = "images"

    datasets = m.ManyToManyField(Dataset, through="DatasetImage")

    image = m.ImageField(
        upload_to=partial(make_image_filepath, prefix=FULLSIZE_IMAGES_DIR),
        null=True,
        blank=True,
        width_field="w",
        height_field="h",
    )

    def __str__(self):
        return self.name or f"Image({self.id})"


m.signals.post_delete.connect(Image.post_delete_remove_file, sender=Image)


class LabelImage(BaseImage):
    FULLSIZE_IMAGES_DIR = "labels"

    datasets = m.ManyToManyField(Dataset, through="DatasetImage")
    # TODO: handle what happens when a label  was created for one model
    # (with one set of labels), but it's used on another (perform checking that
    # labels are the same)
    models = m.ManyToManyField(MLModel)

    image = m.ImageField(
        upload_to=partial(make_image_filepath, prefix=FULLSIZE_IMAGES_DIR),
        null=True,
        blank=True,
        width_field="w",
        height_field="h",
    )

    def __str__(self):
        return f"{self.name} (label)" if self.name else f"LabelImage({self.id})"

    @classmethod
    def post_save_make_raw(cls, sender, instance, created, **kwargs):
        ...


m.signals.post_delete.connect(LabelImage.post_delete_remove_file, sender=LabelImage)
m.signals.post_save.connect(LabelImage.post_save_make_raw, sender=LabelImage)


class DatasetImage(TimestampedModel, m.Model):
    dataset = m.ForeignKey(Dataset, on_delete=m.CASCADE, related_name="datasetimages")
    image = m.ForeignKey(Image, on_delete=m.CASCADE)
    label_image = m.ForeignKey(LabelImage, on_delete=m.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"DatasetImage(id={self.id}, dataset={self.dataset.name}, image={self.image.image.url})"


class Analysis(TimestampedModel, m.Model):
    class Meta:
        verbose_name_plural = "analyses"

    model = m.ForeignKey(MLModel, on_delete=m.SET_NULL, null=True, blank=True)
    datasets = m.ManyToManyField(Dataset)

    name = m.CharField(max_length=255)

    count_labels_json_str = m.TextField(blank=True, default="{}")
    @property
    def count_labels(self):
        return json.loads(self.count_labels_json_str)
    @count_labels.setter
    def count_labels(self, val):
        self.count_labels_json_str = json.dumps(val)

    def __str__(self):
        return f"{self.name} ({self.id})"

    @classmethod
    def perform(cls, model, datasets, count_labels, name=''):
        # : { labels -> {image_path -> (raw_result_path, nice_result_path),
        #     counts -> {image_path -> {label -> count}} }
        r = model.analyze(datasets, count_labels)
        labels = r['labels']
        counts = r.get('counts', None)

        image_path2dsi = {}
        for ds in datasets:
            for dsi in ds.datasetimages.all():
                image_path2dsi[dsi.image.image.path] = dsi

        analysis = cls.objects.create(model=model, name=name)
        analysis.count_labels = count_labels
        analysis.save()
        analysis.datasets.set(datasets)

        for image_path, (raw_result_path, nice_result_path) in labels.items():
            result_label_image = LabelImage.objects.create(
                image=nice_result_path,
            )
            result = analysis.results.create(
                datasetimage=image_path2dsi[image_path],
                labelimage=result_label_image,
            )
            result.counts = counts[image_path] if counts else ''
            result.save()

        return analysis


class Result(TimestampedModel, m.Model):
    analysis = m.ForeignKey(Analysis, on_delete=m.CASCADE, related_name='results')
    datasetimage = m.ForeignKey(DatasetImage, on_delete=m.SET_NULL, null=True, blank=True)
    labelimage = m.OneToOneField(LabelImage, on_delete=m.SET_NULL, null=True, blank=True)

    counts_json_str = m.TextField(blank=True, default="{}")
    @property
    def counts(self):
        return json.loads(self.counts_json_str)
    @counts.setter
    def counts(self, val):
        self.counts_json_str = json.dumps(val)


# Users/Auth Models - just tweak so username is email...
#####################################################################


class UserManager(DefaultUserManager):
    """Define a model manager for User model with no username field."""

    def _create_user(self, email, password, **extra_fields):
        """Create and save a user with the given username, email, and password."""
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    objects = UserManager()

    # changed fields:
    username = None  # remove it as we login with email
    email = m.EmailField(_("email address"), unique=True)  # enforce unique
    full_name = m.CharField(_("full name"), max_length=255, blank=True, db_index=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
