import React, {Component} from "react";
import PropTypes from "prop-types";
import {CompactPicker} from "react-color";

import * as mui from "../../mui-imports.js";
import {MButton} from "../../components/index.js";

const AddEditSegmentDialog = mui.withStyles(theme => ({
  dialogTitle: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    margin: 0,
    padding: theme.spacing.unit * 2,
    paddingRight: 55,
  },
  closeButton: {
    position: "absolute",
    right: 2,
    top: 4,
    color: theme.palette.grey[500],
  },
}))(
  class AddEditSegmentDialog extends Component {
    state = {
      label: this.props.label,
      rgb: this.props.rgb,
    };

    render() {
      const props = this.props;

      return (
        <mui.Dialog open={props.open} onClose={props.onClose}>
          <mui.DialogTitle id="add-segment-dialog" className={props.classes.dialogTitle}>
            {this.props.dialogTitle}
            <mui.IconButton
              aria-label="Close"
              className={props.classes.closeButton}
              onClick={props.onClose}
            >
              <mui.Icon>close</mui.Icon>
            </mui.IconButton>
          </mui.DialogTitle>
          <mui.DialogContent>
            <mui.TextField
              id="standard-name"
              label="Name"
              value={this.state.label}
              onChange={ev => this.setState({label: ev.target.value})}
              margin="normal"
            />
            <br />
            <br />
            Color:
            <br />
            <CompactPicker
              color={{
                r: this.state.rgb[0],
                g: this.state.rgb[1],
                b: this.state.rgb[2],
              }}
              onChange={color => {
                this.setState({
                  rgb: [color.rgb.r, color.rgb.g, color.rgb.b],
                });
              }}
              colors={segmentColorsPalette}
            />
            <br />
            <br />
            <br />
            <MButton
              icon="add"
              children={props.saveText}
              color=":pink"
              variant="contained"
              fullWidth
              onClick={() => this.props.onSave(this.state)}
            />
          </mui.DialogContent>
        </mui.Dialog>
      );
    }
  }
);

AddEditSegmentDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  saveText: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  rgb: PropTypes.array.isRequired,
  segmentIdx: PropTypes.number,
  onSave: PropTypes.func,
};

export default AddEditSegmentDialog;

const segmentColorsPalette = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#F44E3B",
  "#FE9200",
  "#FCDC00",
  "#DBDF00",
  "#A4DD00",
  "#68CCCA",
  "#73D8FF",
  "#AEA1FF",
  "#FDA1FF",
  "#008800",
  "cyan",
  "magenta",
  "#D33115",
  "#E27300",
  "#FCC400",
  "#B0BC00",
  "#68BC00",
  "#16A5A5",
  "#009CE0",
  "#7B64FF",
  "#FA28FF",
  "yellow",
  "#000000",
  "#FFFFFF",
  "#9F0500",
  "#C45100",
  "#FB9E00",
  "#808900",
  "#194D33",
  "#0C797D",
  "#0062B1",
  "#653294",
  "#AB149E",
];
