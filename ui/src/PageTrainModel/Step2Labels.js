import React, {Component} from "react";
import PropTypes from "prop-types";

import PaintLabelsDialog from "./PaintLabelsDialog/PaintLabelsDialog.js";
import {DatasetCard, ItemBtn} from "./DatasetCard.js";

export default class Step2Labels extends Component {
  static propTypes = {
    model: PropTypes.object,
    trainingDatasets: PropTypes.arrayOf(Object).isRequired,
    updateTrainingDataset: PropTypes.func.isRequired,
    addSegment: PropTypes.func.isRequired,
    removeSegment: PropTypes.func.isRequired,
    updateSegment: PropTypes.func.isRequired,
  };

  state = {
    paintLabelsDialog: {
      open: false,
      datasetImage: null,
    },
  };

  render() {
    if (!this.props.trainingDatasets.length) return null;

    return (
      <>
        {this.props.trainingDatasets.map((dataset, datasetIdx) => (
          <DatasetCard
            key={`${dataset.id}-${datasetIdx}`}
            dataset={dataset}
            datasetIdx={datasetIdx}
            updateTrainingDataset={data =>
              this.props.updateTrainingDataset(datasetIdx, data)
            }
            imageActions={params => (
              <ItemBtn
                children="Add/Edit Segmentation Labels"
                variant="contained"
                icon="fa-paint-brush"
                color=":pink"
                onClick={() =>
                  this.setState({
                    paintLabelsDialog: {
                      open: true,
                      datasetImage: params.datasetimage,
                    },
                  })
                }
              />
            )}
          />
        ))}

        {this.state.paintLabelsDialog.open &&
          this.props.model &&
          this.props.trainingDatasets[0] && (
            <PaintLabelsDialog
              fullScreen
              open={this.state.paintLabelsDialog.open}
              onClose={() =>
                this.setState({
                  paintLabelsDialog: {
                    open: false,
                    datasetImage: null,
                  },
                })
              }
              datasetimage={this.state.paintLabelsDialog.datasetImage}
              model={this.props.model}
              segments={this.props.model.labels}
              addSegment={this.props.addSegment}
              removeSegment={this.props.removeSegment}
              updateSegment={this.props.updateSegment}
            />
          )}
      </>
    );
  }
}
