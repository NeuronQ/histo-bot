import React from "react";
import * as sui from "semantic-ui-react";

import * as mui from "../mui-imports.js";
import {MButton} from "../components";

export const ItemBtn = props =>
  MButton({
    size: "small",
    style: {marginTop: -8, marginRight: 8},
    ...props,
  });

const RemoveBtn = props =>
  ItemBtn({
    icon: "fa-times",
    children: "Remove",
    ...props,
  });

export const DatasetCard = ({
  dataset,
  datasetIdx,
  removeTrainingDataset,
  updateTrainingDataset,
  removeTrainingDatasetImage,
  addTrainingDatasetImage,
  actions,
  imageActions,
}) => (
  <div>
    <mui.Card square>
      <mui.CardHeader
        avatar={
          <mui.Avatar aria-label="Recipe" style={{backgroundColor: mui.teal[500]}}>
            <mui.Icon
              className="fas fa-database"
              style={{
                textAlign: "center",
                fontSize: "1.2rem",
              }}
            />
          </mui.Avatar>
        }
        action={
          <>
            <br />
            {actions}
          </>
        }
        title={
          <>
            Dataset:{" "}
            {dataset.id ? (
              <code>
                {dataset.created_at.toLocaleString()} - {dataset.name}
              </code>
            ) : (
              <sui.Input
                value={dataset.name}
                onChange={ev => updateTrainingDataset({name: ev.target.value})}
                style={{width: 400}}
              />
            )}
          </>
        }
        subheader={`${dataset.datasetimages.length} images`}
      />
    </mui.Card>
    <div>
      {dataset.datasetimages.map((dsi, dsiIdx) => (
        <mui.Card key={`${dataset.id}-${datasetIdx}-${dsi.id}-${dsiIdx}`} square>
          <mui.CardHeader
            avatar={
              <mui.Avatar style={{backgroundColor: mui.purple[500]}}>
                {dsi.image_id ? (
                  <img
                    src={dsi.image.summary.thumb}
                    style={{width: "100%", height: "auto"}}
                    alt=""
                  />
                ) : (
                  <mui.Icon>image</mui.Icon>
                )}
              </mui.Avatar>
            }
            action={
              <>
                <br />
                {imageActions && (
                  <div>
                    <span style={{position: "relative", top: -4, marginRight: 8}}>
                      {imageActions({datasetimage: dsi})}
                    </span>
                  </div>
                )}

                {(dsi._status === "not uploaded" || dsi._staus === "uploaded") && (
                  <RemoveBtn onClick={() => removeTrainingDatasetImage(dsiIdx)} />
                )}

                {dsi._status === "uploading" && (
                  <div>
                    <span style={{position: "relative", top: -4, marginRight: 16}}>
                      Uploading...
                      <mui.CircularProgress
                        style={{
                          width: 20,
                          height: 20,
                          marginLeft: 16,
                          position: "relative",
                          top: 4,
                        }}
                      />
                    </span>
                  </div>
                )}

                {dsi._status === "upload failed" && (
                  <div>
                    <span
                      style={{
                        position: "relative",
                        top: -4,
                        marginRight: 8,
                        color: "red",
                      }}
                    >
                      Upload failed!
                    </span>
                    <RemoveBtn
                      onClick={() => removeTrainingDatasetImage(dsiIdx)}
                      variant="outlined"
                    />
                  </div>
                )}
              </>
            }
            title={
              dsi.image_id ? (
                dsi.image.name
              ) : (
                <label
                  htmlFor={`input-dsi-image-${dataset.id}-${datasetIdx}-${
                    dsi.id
                  }-${dsiIdx}`}
                >
                  Choose image to upload:
                </label>
              )
            }
            subheader={
              dsi.image_id ? (
                `${dsi.image.w}×${dsi.image.h} px`
              ) : (
                <input
                  type="file"
                  id={`input-dsi-image-${dataset.id}-${datasetIdx}-${dsi.id}-${dsiIdx}`}
                  ref={dsi._fileInput}
                />
              )
            }
          />
        </mui.Card>
      ))}

      {!dataset.id && (
        <mui.Card square>
          <mui.CardHeader
            title={
              <MButton
                onClick={() =>
                  addTrainingDatasetImage({
                    _fileInput: React.createRef(),
                    _status: "not uploaded",
                  })
                }
                variant="contained"
                color=":purple"
              >
                Add Image
              </MButton>
            }
          />
        </mui.Card>
      )}

      <br />
    </div>
  </div>
);
