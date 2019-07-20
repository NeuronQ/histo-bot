API_URL='http://localhost:8000/api/v1'
LOCAL_API_USER='io@neuronq.ro'
LOCAL_API_PWD='8*Histobot'
AUTH="--auth $LOCAL_API_USER:$LOCAL_API_PWD"


## Models
# List
http $API_URL/models/ $AUTH
# Get
http $API_URL/models/1/ $AUTH
# Create
echo '{"architecture_id": 1, "name": "Model 2"}' | http POST $API_URL/models/ $AUTH
# Update
echo '{"name": "Model 1.10"}' | http PATCH $API_URL/models/1/ $AUTH
echo '{
  "architecture": 1,
  "name": "Model 1.2",
  "current_parameter": 1
}' | http PUT $API_URL/models/1/ $AUTH
# Delete
http DELETE $API_URL/models/2/ $AUTH
# Train
echo '{"dataset_ids": [1], "params": {"epochs": 10}}' | http POST $API_URL/models/1/train/ $AUTH
echo '{"dataset_ids": [1], "training_session_id": 20, "params": {"epochs": 10}}' | http POST $API_URL/models/1/train/ $AUTH


## Images
# List
http $API_URL/images/ $AUTH
# Get
http $API_URL/images/11/ $AUTH
# Create (upload)
http -f POST $API_URL/images/ image@~/Downloads/example_img_large.jpg $AUTH

## Datasets
# List
http $API_URL/datasets/ $AUTH
# Get
http $API_URL/datasets/1/ $AUTH
# Update (basic)
echo '{"name": "Dataset 1.1"}' | http PATCH $API_URL/datasets/1/ $AUTH
# Update (nested)
echo '{
  "datasetimages": [
    {"id": 11, "purpose": "train"},
    {"image_id": 15, "purpose": "validation"}
  ]
}' | http PATCH $API_URL/datasets/1/ $AUTH
