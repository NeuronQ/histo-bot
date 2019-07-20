from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import re_path


import coreapp.consumers as consumers

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'websocket': AuthMiddlewareStack(
        URLRouter([
            re_path(r'^ws/train/model-(?P<model_id>\d+)/ts-(?P<training_session_id>\d+)/$',
                    consumers.TrainingProgressConsumer),
        ])
    ),
})
