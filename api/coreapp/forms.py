import json
import traceback

from django import forms
from django.utils.html import mark_safe

from .models import Dataset, Analysis


class TrainModelForm(forms.Form):
    datasets = forms.MultipleChoiceField(
        choices=[(ds.id, ds.name) for ds in Dataset.objects.all()]
    )
    training_hparams = forms.CharField(widget=forms.Textarea, initial='{}')

    def save(self, mlmodel, user):
        try:
            training_hparams = json.loads(self.cleaned_data['training_hparams'])
            dataset_ids = list(map(int, self.cleaned_data['datasets']))
            return mlmodel.train(dataset_ids, training_hparams)
        except Exception as exc:
            self.add_error(None, str(exc) + ": \n\n" + traceback.format_exc())
            raise exc


class PerformAnalysisForm(forms.Form):
    analysis_name = forms.CharField()
    datasets = forms.MultipleChoiceField(
        choices=[(ds.id, ds.name) for ds in Dataset.objects.all()]
    )
    count_labels = forms.CharField(widget=forms.Textarea, initial='', required=False)

    def save(self, mlmodel, user):
        try:
            count_labels = (
                json.loads(self.cleaned_data['count_labels'])
                if self.cleaned_data['count_labels'] else
                None)
            datasets = Dataset.objects.filter(pk__in=self.cleaned_data['datasets'])
            return Analysis.perform(
                mlmodel, datasets, count_labels, name=self.cleaned_data['analysis_name'])
        except Exception as exc:
            self.add_error(None, str(exc) + ": \n\n" + traceback.format_exc())
            raise exc
