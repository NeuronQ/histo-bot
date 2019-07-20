import React, {Component} from "react";
// import PropTypes from "prop-types";

import {MButton, MPaper} from "../components";
import {MLModels} from "../api/api.js";

class PageCreateModel extends Component {
  static propTypes = {};

  createModelThenTrain = async data => {
    const res = await MLModels.create(data);
    this.props.setLastCreatedModel(res.data);
    this.props.history.push(`/models/${res.data.id}/train`);
  };

  render() {
    return (
      <div className="Page">
        <MPaper>
          <pre>[ create model ]</pre>
          <MButton
            linkTo="/models/1/train/step-1-data"
            variant="contained"
            color="primary"
          >
            Create & train
          </MButton>
        </MPaper>
      </div>
    );
  }
}

export default PageCreateModel;
