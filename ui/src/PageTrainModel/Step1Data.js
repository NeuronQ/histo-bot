import React, {Component} from "react";
import PropTypes from "prop-types";

import * as mui from "../mui-imports.js";
import {MButton, SelectDialog} from "../components";
import {DatasetCard} from "./DatasetCard.js";

const ItemBtn = props =>
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

export default class ModelTrainingStep1Data extends Component {
  static propTypes = {
    model: PropTypes.object,
    datasetsById: PropTypes.instanceOf(Map).isRequired,
    trainingDatasets: PropTypes.arrayOf(Object).isRequired,
    addTrainingDataset: PropTypes.func.isRequired,
    removeTrainingDataset: PropTypes.func.isRequired,
    updateTrainingDataset: PropTypes.func.isRequired,
    addTrainingDatasetImage: PropTypes.func.isRequired,
    removeTrainingDatasetImage: PropTypes.func.isRequired,
  };

  state = {
    addDatasetDialogOpen: false,
  };

  handleSelectDataset = dataset => {
    this.setState({addDatasetDialogOpen: false});
    if (dataset) {
      this.props.addTrainingDataset(dataset);
    }
  };

  render() {
    return (
      <>
        <mui.Grid container spacing={16}>
          <mui.Grid item xs={6}>
            <MButton
              children="Select Dataset"
              onClick={() => this.setState({addDatasetDialogOpen: true})}
              color=":teal"
              variant="contained"
              icon="fa-database"
              fullWidth
            />
          </mui.Grid>
          <mui.Grid item xs={6}>
            <MButton
              children="New Dataset / Upload Image(s)"
              onClick={() =>
                this.props.addTrainingDataset({
                  name: "",
                  datasetimages: [
                    {
                      _fileInput: React.createRef(),
                      _status: "not uploaded",
                    },
                  ],
                })
              }
              color=":purple"
              variant="contained"
              icon="cloud_upload"
              fullWidth
            />
          </mui.Grid>
        </mui.Grid>
        <br />

        {this.props.trainingDatasets.map((dataset, datasetIdx) => (
          <DatasetCard
            key={`${dataset.id}-${datasetIdx}`}
            dataset={dataset}
            datasetIdx={datasetIdx}
            removeDataset={() => this.props.removeTrainingDataset(datasetIdx)}
            updateTrainingDataset={data =>
              this.props.updateTrainingDataset(datasetIdx, data)
            }
            removeTrainingDatasetImage={dsiIdx =>
              this.props.removeTrainingDatasetImage(datasetIdx, dsiIdx)
            }
            addTrainingDatasetImage={data =>
              this.props.addTrainingDatasetImage(datasetIdx, data)
            }
            actions={
              <RemoveBtn
                onClick={() => this.props.removeTrainingDataset(datasetIdx)}
                variant="outlined"
              />
            }
          />
        ))}

        <SelectDialog
          title="Add dataset"
          open={this.state.addDatasetDialogOpen}
          onClose={() => this.handleSelectDataset(null)}
          items={Array.from(this.props.datasetsById.values()).filter(
            ds => !this.props.trainingDatasets.find(tds => tds.id === ds.id)
          )}
          renderItem={it => (
            <mui.ListItem
              button
              onClick={() => this.handleSelectDataset(this.props.datasetsById.get(it.id))}
              key={it.id}
            >
              {it.name}
            </mui.ListItem>
          )}
        />
      </>
    );
  }
}
