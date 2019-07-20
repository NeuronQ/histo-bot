import React, {Component} from "react";
// import PropTypes from "prop-types";

import {Link} from "react-router-dom";
import {Typography} from "@material-ui/core";
import * as mui from "../mui-imports.js";

import {MButton} from "../components";

const TrainBtn = props =>
  MButton({
    ...props,
    color: ":blue",
    size: "small",
    variant: "contained",
    icon: "fa-cogs",
  });

const DeleteBtn = props =>
  MButton({
    ...props,
    color: ":red",
    textColor: ":red",
    size: "small",
    icon: "delete_forever",
  });

let id = 0;
function createData(name, architecture, trained_at, trained_by) {
  id += 1;
  return {id, name, architecture, trained_at, trained_by};
}
const rows = [
  createData("Segmenter XYZ", "ResNet34-UNet", new Date(), "Diana M."),
  createData("Nuclei segm-fg3", "ResNet50-UNet", new Date(), "Marie Q."),
  createData("Test v10", "ResNet34-UNet", new Date(), "Pierre F."),
];

class PageModels extends Component {
  static propTypes = {};

  state = {
    newModelArchDialogOpen: false,
  };

  handleNewModelArchDialogClose = val => {
    this.setState({newModelArchDialogOpen: false});
    if (val) {
      this.props.history.push("/models/new/step-1-data?arch=" + val);
    }
  };

  render() {
    return (
      <div className="Page PageModels">
        <mui.Paper square style={{paddingBottom: "16px"}}>
          <mui.Table>
            <mui.TableHead>
              <mui.TableRow>
                <mui.TableCell>Name</mui.TableCell>
                <mui.TableCell>Architecture</mui.TableCell>
                <mui.TableCell>Trained</mui.TableCell>
                <mui.TableCell>By</mui.TableCell>
                <mui.TableCell />
              </mui.TableRow>
            </mui.TableHead>
            <mui.TableBody>
              {rows.map(row => (
                <mui.TableRow key={row.id}>
                  <mui.TableCell>{row.name}</mui.TableCell>
                  <mui.TableCell>{row.architecture}</mui.TableCell>
                  <mui.TableCell>{row.trained_at.toLocaleString()}</mui.TableCell>
                  <mui.TableCell>{row.trained_by}</mui.TableCell>
                  <mui.TableCell>
                    <DeleteBtn>Delete</DeleteBtn>
                    &nbsp;&nbsp;&nbsp;
                    <TrainBtn>Train</TrainBtn>
                  </mui.TableCell>
                </mui.TableRow>
              ))}
            </mui.TableBody>
          </mui.Table>
          <br />
          <Typography align="center">
            <Link to="/models/new">
              <mui.Button
                variant="contained"
                color="primary"
                onClick={() => this.setState({newModelArchDialogOpen: true})}
              >
                Create New Model
              </mui.Button>
            </Link>
          </Typography>
        </mui.Paper>
      </div>
    );
  }
}

export default PageModels;
