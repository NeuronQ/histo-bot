import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from .models import MLModel
from utils.utils import pp


class TrainingProgressConsumer(WebsocketConsumer):
    def connect(self):
        self.model_id = int(self.scope['url_route']['kwargs']['model_id'])
        self.ts_id = int(self.scope['url_route']['kwargs']['training_session_id'])

        self.group_name = f'training.model-{self.model_id}.ts-{self.ts_id}'

        # join group:
        # a group that progress can be broascast to is created so that progress
        # reporting keeps working after connection drops or page refreshes
        async_to_sync(self.channel_layer.group_add)(
            self.group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # leave group
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name,
            self.channel_name
        )

    # receive message from channel/WebSocket
    def receive(self, text_data):
        msg = json.loads(text_data)

        if msg['type'] == 'train':
            self.handle_train(msg)

    def handle_train(self, msg):
        # send message to WebSocket
        self.send_to_channel_and_group({
            'type': 'training_started',
            'training_session_id': self.ts_id
        })

        model = MLModel.objects.get(pk=self.model_id)

        def on_epoch_done(epoch, *args, **kwargs):
            self.send_to_channel_and_group({
                'type': 'training_progress',
                'training_session_id': self.ts_id,
                'epoch': epoch + 1,
            })

        fake = msg.get('__fake__', False)
        params = dict(
            dataset_ids=list(map(int, msg.get('dataset_ids'))),
            training_hparams=msg.get('training_hparams'),
            on_epoch_done=on_epoch_done,
            _fake=fake,
        )

        print(f"\n====== training:\n", pp(params))
        # import pdb; pdb.set_trace()
        res = model.train(**params)
        if not fake:
            json_safe_res = {
                'scores': res['scores'],
                'results': [
                    (str(k), list(map(str, v))) for k, v in res['results'].items()
                ],
                'new_parameters_path': (
                    str(res['new_parameters_path'])
                    if res.get('new_parameters_path', None) else
                    None),
                'new_learner_path': (
                    str(res['new_learner_path'])
                    if res.get('new_learner_path', None) else
                    None),
            }
        else:
            json_safe_res = {}

        self.send_to_channel_and_group({
            'type': 'training_done',
            'result': json_safe_res,
        })

    # receive message from room group
    def broadcast_training_progress(self, msg):
        # for current consumer the message has already been sent to socket
        if msg['_origin_consumer_id_'] == id(self):
            return
        # send message to WebSocket
        self.send_json({**msg, 'type': 'training_progress'})

    def broadcast_training_started(self, msg):
        if msg['_origin_consumer_id_'] == id(self):
            return
        self.send_json({**msg, 'type': 'training_started'})

    def broadcast_training_done(self, msg):
        if msg['_origin_consumer_id_'] == id(self):
            return
        self.send_json({**msg, 'type': 'training_done'})

    def send_json(self, msg):
        self.send(text_data=json.dumps(msg))

    def send_to_group(self, msg):
        # self.channel_layer.group_send(self.group_name, msg)
        async_to_sync(self.channel_layer.group_send)(self.group_name, msg)

    def send_to_channel_and_group(self, msg):
        self.send_json(msg)
        self.send_to_group({
            **msg,
            'type': 'broadcast_' + msg['type'],
            # use _origin_consumer_id_ so current consumer can ignore this
            '_origin_consumer_id_': id(self)
        })
