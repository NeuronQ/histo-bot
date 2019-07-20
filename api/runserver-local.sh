#!/bin/sh
docker run -p 6379:6379 redis:2.8 \
    & python manage.py runserver histobot.test:8000
