import React, {Component} from "react";
// import PropTypes from "prop-types";
import {Route, Switch} from "react-router-dom";
import queryString from "query-string";
import {default as imm} from "object-path-immutable";
import * as sui from "semantic-ui-react";

import * as mui from "../mui-imports.js";
import {augmentWithStateFieldArrayMethods} from "../utils.js";
import {Datasets, MLModels, Images, LabelImages, APIResponseError} from "../api/api.js";
import {MButton} from "../components";
import Step1Data from "./Step1Data.js";
import Step2Labels from "./Step2Labels.js";
import Step3Training from "./Step3Training.js";

const steps = [
  {
    key: "data",
    icon: "images",
    title: "Data",
    description: "Add/select training data",
    active: true,
  },
  {
    key: "labels",
    icon: "paint brush",
    title: "Labels",
    description: "Label training data",
    // disabled: true,
  },
  {
    key: "training",
    icon: "cogs",
    title: "Training",
    description: "Train model with labeled data",
  },
];

class PageTrainModel extends Component {
  static propTypes = {};

  state = {
    DATA: {
      datasetsById: new Map(),
      trainingDatasets: [],
      model: null,
    },
    disableNav: false,
  };

  constructor(props) {
    super(props);
    augmentWithStateFieldArrayMethods(this, "DATA.model.labels", "Segment");
    augmentWithStateFieldArrayMethods(this, "DATA.trainingDatasets", "TrainingDataset");
  }

  componentDidMount() {
    MLModels.get(this.props.match.params.modelId).then(res => {
      this.setState(s => imm.set(s, "DATA.model", MLModels.fromApiData(res.data)));
    });

    Datasets.list().then(res => {
      const datasetsById = new Map(
        res.data.results.map(ds => [ds.id, Datasets.fromApiData(ds)])
      );
      // const datasets = Array.from(datasetsById.values()); // DEBUG
      this.setState(s =>
        imm(s)
          .set("DATA.datasetsById", datasetsById)
          // .set("DATA.trainingDatasets", datasets.slice(0, 2)) // DEBUG
          .value()
      );
    });
  }

  addTrainingDatasetImage = (datasetIdx, dsi) =>
    this.setState(s =>
      imm.push(s, `DATA.trainingDatasets.${datasetIdx}.datasetimages`, dsi)
    );

  removeTrainingDatasetImage = (datasetIdx, dsiIdx) =>
    this.setState(s =>
      imm.del(s, `DATA.trainingDatasets.${datasetIdx}.datasetimages.${dsiIdx}`)
    );

  replaceTrainingDatasetImage = (datasetIdx, dsiIdx, data) =>
    this.setState(s =>
      imm.set(s, `DATA.trainingDatasets.${datasetIdx}.datasetimages.${dsiIdx}`, data)
    );

  updateTrainingDatasetImage = (datasetIdx, dsiIdx, data) =>
    this.setState(s =>
      imm.merge(s, `DATA.trainingDatasets.${datasetIdx}.datasetimages.${dsiIdx}`, data)
    );

  navToStep = stepNo => {
    const {match, location, history} = this.props;
    history.push(
      `${match.url}/step-${stepNo + 1}-${steps[stepNo].key}${location.search}`
    );
  };

  navToNextStep = async () => {
    const activeStepNo = this.getActiveStepNo(this.props.location.pathname);
    const activeStep = steps[activeStepNo].key;

    this.setState({disableNav: true});

    try {
      if (activeStep === "data") await this.onNextFromStep1Data();
      else if (activeStep === "labels") await this.onNextFromStep2Labels();

      this.navToStep(activeStepNo + 1);
    } catch (e) {
      // TODO: display error to user
      console.log("Dataset creation or image upload error:", e);
    } finally {
      this.setState({disableNav: false});
    }
  };

  onNextFromStep1Data = async () => this.createNewDatasets();

  onNextFromStep2Labels = async () => {
    await this.updateModel();
    await this.saveLabels();
  };

  markActiveStep = (steps, activeStep) => {
    return steps.map((step, idx) => ({
      ...step,
      active: idx === activeStep,
    }));
  };

  getActiveStepNo(path) {
    const m = path.match(/\/train\/step-(\d+)/);
    if (!m) return -1;
    return m[1] - 1;
  }

  createNewDatasets = async () => {
    for (
      let datasetIdx = 0;
      datasetIdx < this.state.DATA.trainingDatasets.length;
      datasetIdx++
    ) {
      const dataset = this.state.DATA.trainingDatasets[datasetIdx];

      if (dataset.id) continue;

      const createdDatasetImages = [];

      for (let dsiIdx = 0; dsiIdx < dataset.datasetimages.length; dsiIdx++) {
        const dsi = dataset.datasetimages[dsiIdx];

        if (dsi.image_id) {
          createdDatasetImages.push(dsi);
          continue;
        }

        this.updateTrainingDatasetImage(datasetIdx, dsiIdx, {_status: "uploading"});

        try {
          const createImageRes = await this.createImage(dsi, dsiIdx);

          const createdDatasetImage = {
            image_id: createImageRes.data.id,
            image: createImageRes.data,
            purpose: "validation",
            _status: "uploaded",
          };
          createdDatasetImages.push(createdDatasetImage);
          this.updateTrainingDatasetImage(datasetIdx, dsiIdx, createdDatasetImage);
          //
        } catch (e) {
          this.updateTrainingDatasetImage(datasetIdx, dsiIdx, {
            _status: "upload failed",
            _error: e,
          });
        }
      }

      if (createdDatasetImages.length !== dataset.datasetimages.length) {
        throw Error("Some images could not be uploaded");
      }

      const createdDatasetRes = await Datasets.create({
        name: dataset.name,
        datasetimages: createdDatasetImages.map(it => ({
          image_id: it.image_id,
          purpose: it.purpose,
        })),
      });
      if (Math.floor(createdDatasetRes.status / 100) === 2) {
        this.updateTrainingDataset(datasetIdx, {
          ...createdDatasetRes.data,
          datasetimages: createdDatasetImages,
        });
      }
    }
  };

  createImage = async (dsi, dsiIdx) => {
    const file = dsi._fileInput.current.files[0];
    const match = file.name.match(/(.+)\.[^.]+$/);
    const name = dsiIdx + "-" + (match ? match[1] : file.name);
    return Images.create({name, image: {file}});
  };

  updateModel = () => MLModels.update(this.state.DATA.model);

  saveLabels = async () => {
    for (
      let datasetIdx = 0;
      datasetIdx < this.state.DATA.trainingDatasets.length;
      datasetIdx++
    ) {
      const dataset = this.state.DATA.trainingDatasets[datasetIdx];

      for (let dsiIdx = 0; dsiIdx < dataset.datasetimages.length; dsiIdx++) {
        const dsi = dataset.datasetimages[dsiIdx];

        if (!dsi._label_dirty) continue;

        if (!dsi.label_image) {
          throw Error(`Error: image ${dsiIdx} of dataset "${dsi.name}" is not labeled`);
        }

        try {
          const res = await this.updateOrCreateLabelImage(dsi);

          if (Math.floor(res.status / 100) !== 2) {
            throw APIResponseError(res);
          }

          this.updateTrainingDatasetImage(datasetIdx, dsiIdx, {
            label_image_id: res.data.id,
            _label_save_status: "success",
            _label_dirty: false,
          });
          dsi.label_image.id = res.data.id;
        } catch (e) {
          console.error("Error saving label:", e);

          this.updateTrainingDatasetImage(datasetIdx, dsiIdx, {
            _label_save_status: "failed",
            _label_save_error: e,
          });
        }
      }
    }
  };

  updateOrCreateLabelImage = dsi => {
    const base64ImgData = dsi.label_image._segmentation_data;
    if (dsi.label_image.id) {
      return LabelImages.update({
        id: dsi.label_image.id,
        image: {file_contents: base64ImgData},
        dataset_image_id: dsi.id,
      });
    } else {
      return LabelImages.create({
        image: {file_contents: base64ImgData},
        models: [this.props.match.params.modelId],
        dataset_image_id: dsi.id,
      });
    }
  };

  render() {
    const {match, location} = this.props;
    const archId = +queryString.parse(location.search).arch || null;
    const activeStep = this.getActiveStepNo(location.pathname);

    return (
      <div className="ModelTraining">
        <mui.Grid container>
          <mui.Grid item xs={8}>
            Based on arcitecture <code>{archId}</code>.
          </mui.Grid>
          <mui.Grid item xs={4}>
            <mui.Typography align="right">
              <PrevBtn
                onClick={() => this.navToStep(activeStep - 1)}
                disabled={this.state.disableNav || activeStep <= 0}
              />
              &nbsp;&nbsp;&nbsp;
              <NextBtn
                onClick={this.navToNextStep}
                disabled={this.state.disableNav || activeStep === steps.length - 1}
              />
            </mui.Typography>
          </mui.Grid>
        </mui.Grid>

        <sui.Step.Group
          items={this.markActiveStep(steps, activeStep)}
          style={{width: "100%", borderRadius: 0}}
        />
        <br />
        <br />

        <Switch>
          <Route
            exact
            path={match.path + "/step-1-data"}
            render={props => (
              <Step1Data
                {...{
                  ...props,
                  ...{
                    model: this.state.DATA.model,
                    datasetsById: this.state.DATA.datasetsById,
                    trainingDatasets: this.state.DATA.trainingDatasets,
                    addTrainingDataset: this.addTrainingDataset,
                    removeTrainingDataset: this.removeTrainingDataset,
                    updateTrainingDataset: this.updateTrainingDataset,
                    addTrainingDatasetImage: this.addTrainingDatasetImage,
                    removeTrainingDatasetImage: this.removeTrainingDatasetImage,
                  },
                }}
              />
            )}
          />
          <Route
            exact
            path={match.path + "/step-2-labels"}
            render={props => (
              <Step2Labels
                {...{
                  ...props,
                  ...{
                    model: this.state.DATA.model,
                    trainingDatasets: this.state.DATA.trainingDatasets,
                    updateTrainingDataset: this.updateTrainingDataset,
                    addSegment: this.addSegment,
                    removeSegment: this.removeSegment,
                    updateSegment: this.updateSegment,
                  },
                }}
              />
            )}
          />
          <Route
            exact
            path={match.path + "/step-3-training"}
            render={props => (
              <Step3Training
                {...{
                  ...props,
                  ...{
                    model: this.state.DATA.model,
                    trainingDatasets: this.state.DATA.trainingDatasets,
                  },
                }}
              />
            )}
          />
        </Switch>

        <br />
        <mui.Grid container spacing={16}>
          <mui.Grid item xs={6}>
            <PrevBtn
              onClick={() => this.navToStep(activeStep - 1)}
              disabled={this.state.disableNav || activeStep <= 0}
              fullWidth
              size="large"
            />
          </mui.Grid>
          <mui.Grid item xs={6}>
            <NextBtn
              onClick={this.navToNextStep}
              disabled={this.state.disableNav || activeStep === steps.length - 1}
              fullWidth
              size="large"
            />
          </mui.Grid>
        </mui.Grid>
      </div>
    );
  }
}

export default PageTrainModel;

const NextBtn = props =>
  MButton({
    color: "primary",
    size: "small",
    variant: "contained",
    icon: "chevron_right",
    iconRight: true,
    children: "Next",
    ...props,
  });

const PrevBtn = props =>
  MButton({
    size: "small",
    icon: "chevron_left",
    children: "Previous",
    ...props,
  });
