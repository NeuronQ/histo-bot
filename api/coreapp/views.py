import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.views.generic import View
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Analysis,
    Dataset,
    DatasetImage,
    Image,
    LabelImage,
    MLModel,
)
from .helpers import NestedWritableFieldsSerializerMixin, make_model_serializer_viewset

User = get_user_model()


# class MultiSerializerMixin(object):
#     def get_serializer_class(self):
#         return self.serializer_classes.get(
#             self.action, self.serializer_classes['default']
#         )


# class Pagination(LimitOffsetPagination):
#     default_limit = 100


class FrontendAppView(View):
    """
    Serves the compiled frontend entry point (only works if you have run `npm
    run build`).
    """

    def get(self, request):
        try:
            with open(os.path.join(settings.FRONTEND_DIR, "build", "index.html")) as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            # logging.exception('Production build of app not found')
            return HttpResponse(
                """
                This URL is only used when you have built the production
                version of the app. Visit http://localhost:3000/ instead, or
                run `npm run build` to test the production version.
                """,
                status=501,
            )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class CurrentUserView(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class MLModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModel
        fields = (
            "id",
            "name",
            "learner_path",
            "parameters_path",
            "labels",
            "hparams",
            "training_hparams",
            "snapshots",
        )
        read_only_fields = ("snapshots",)
        extra_kwargs = {
            "labels": {"write_only": True},
            "learner_constructor_params": {"write_only": True},
        }

    labels = serializers.JSONField(required=False)
    hparams = serializers.JSONField(required=False)
    training_hparams = serializers.JSONField(required=False)
    snapshots = serializers.JSONField(required=False)

    def create(self, validated_data):
        m = super().create(validated_data)
        if "labels" in validated_data:
            m.labels = validated_data["labels"]
            m.save()
        if "hparams" in validated_data:
            m.hparams = validated_data["hparams"]
            m.save()
        if "training_hparams" in validated_data:
            m.training_hparams = validated_data["training_hparams"]
            m.save()
        return m

    def update(self, instance, validated_data):
        m = super().update(instance, validated_data)
        if "labels" in validated_data:
            m.labels = validated_data["labels"]
            m.save()
        if "hparams" in validated_data:
            m.hparams = validated_data["hparams"]
            m.save()
        if "training_hparams" in validated_data:
            m.training_hparams = validated_data["training_hparams"]
            m.save()
        return m


class ResponseThen(Response):
    def __init__(self, data, then_callback, **kwargs):
        super().__init__(data, **kwargs)
        self.then_callback = then_callback

    def close(self):
        super().close()
        self.then_callback()


class MLModelsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    model = MLModel
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer

    # TODO: adapt next to current version
    @action(methods=["post"], detail=True, url_path="train")
    def train(self, request, pk=None):
        model = self.get_object()

        dataset_ids = request.data.get("dataset_ids")
        params = request.data.get("params", {})
        training_session_id = request.data.get("training_session_id", None)
        parameters_id = request.data.get("parameters_id", None)

        # get or create TrainingSession
        if training_session_id is None:
            ts = model.trainingsession_set.create()
            training_session_id = ts.id
        else:
            ts = model.trainingsession_set.get(pk=training_session_id)

        def do_training():
            (
                model.train
                if not request.query_params.get("_fake", None)
                else model.fake_train
            )(
                dataset_ids=dataset_ids,
                params=params,
                training_session=ts,
                parameters_id=parameters_id,
            )

        return ResponseThen(
            {"training_session_id": ts.id}, do_training, status=status.HTTP_200_OK
        )

DatasetSerializer, DatasetsViewSet = make_model_serializer_viewset(Dataset)

AnalysisSerializer, AnalysesViewSet = make_model_serializer_viewset(Analysis)


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = (
            "id",
            "name",
            "created_at",
            "updated_at",
            "image",
            "w",
            "h",
            "datasets",
            "summary",
        )


class ImagesViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    model = Image
    queryset = Image.objects.all()
    serializer_class = ImageSerializer


class LabelImageSerializer(serializers.ModelSerializer):
    # models = serializers.PrimaryKeyRelatedField(
    #     queryset=MLModel.objects.all(), many=True
    # )
    dataset_image_id = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = LabelImage
        fields = (
            "id",
            "dataset_image_id",
            "models",
            "name",
            "created_at",
            "updated_at",
            "image",
            "w",
            "h",
            "datasets",
            "summary",
        )

    def create(self, validated_data):
        # attach this LabelImge to a DatasetImage
        dataset_image_id = validated_data.pop("dataset_image_id")
        dsi = DatasetImage.objects.get(pk=dataset_image_id)
        label_image = super().create(validated_data)
        dsi.label_image = label_image
        dsi.save()
        return label_image


class LabelImagesViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    model = LabelImage
    queryset = LabelImage.objects.all()
    serializer_class = LabelImageSerializer


class DatasetImageSerializer(
    NestedWritableFieldsSerializerMixin, serializers.ModelSerializer
):
    dataset_id = serializers.IntegerField(required=False)
    image_id = serializers.IntegerField(required=False)
    image = ImageSerializer(required=False)
    label_image_id = serializers.IntegerField(required=False)
    label_image = LabelImageSerializer(required=False)

    class Meta:
        model = DatasetImage
        fields = (
            "id",
            "dataset_id",
            "image_id",
            "image",
            "label_image_id",
            "label_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("image",)
        nested_fields = {}
        extra_kwargs = {"id": {"read_only": False, "required": False}}


class DatasetSerializer(
    NestedWritableFieldsSerializerMixin, serializers.ModelSerializer
):
    datasetimages = DatasetImageSerializer(many=True)

    class Meta:
        model = Dataset
        fields = (
            "id",
            "created_at",
            "updated_at",
            # 'images',
            "name",
            "datasetimages",
        )
        extra_kwargs = {"id": {"read_only": False, "required": False}}
        nested_fields = {"datasetimages": {"serializer": DatasetImageSerializer}}

    # def create(self, validated_data):
    #     dataset_images = validated_data.


class DatasetsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    model = Dataset
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer


# class UserViewSet(viewsets.ModelViewSet):
#     """
#     API endpoint that allows users to be viewed or edited.
#     """
#     queryset = User.objects.all().order_by('-date_joined')
#     serializer_class = UserSerializer


# class GroupViewSet(viewsets.ModelViewSet):
#     """
#     API endpoint that allows groups to be viewed or edited.
#     """
#     queryset = Group.objects.all()
#     serializer_class = GroupSerializer
