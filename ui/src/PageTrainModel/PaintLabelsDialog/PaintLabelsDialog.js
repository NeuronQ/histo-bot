import React, {Component} from "react";
import PropTypes from "prop-types";
import {default as imm} from "object-path-immutable";
import * as sui from "semantic-ui-react";

import * as mui from "../../mui-imports.js";
import {MButton, getColor} from "../../components/index.js";
import Painter from "./Painter.js";
import AddEditSegmentDialog from "./AddEditSegmentDialog.js";
import SegmentMenu from "./SegmentMenu.js";

export default class PaintLabelsDialog extends Component {
  static propTypes = {
    fullScreen: PropTypes.bool,
    open: PropTypes.bool,
    datasetimage: PropTypes.object,
    model: PropTypes.object,
    segments: PropTypes.array,
    onClose: PropTypes.func.isRequired,
    addSegment: PropTypes.func.isRequired,
    removeSegment: PropTypes.func.isRequired,
    updateSegment: PropTypes.func.isRequired,
  };

  state = {
    imgW: null,
    imgH: null,
    imgLoaded: false,
    activeSegmentIdx: 1,
    segmentCtrlsDisabled: false,
    segmentAnchorEl: null,
    selectedSegmentIdx: null,
    brushMode: "draw",
    addEditSegmentDialog: {
      open: false,
      saveText: "",
      label: "",
      rgb: [0, 0, 255],
      onSave: null,
      segmentIdx: null,
    },
  };

  drawerWidth = 240;
  topBarHeight = 64;

  constructor(props) {
    super(props);
    this.imgRef = React.createRef();
    this.canvasContainerRef = React.createRef();
    this.brushColor = this.rgb2hex(this.props.segments[1].rgb);
  }

  handleClose = () => {
    if (this.painter) {
      this.props.datasetimage.label_image._segmentation_data = this.painter.getDataURL();
    }
    this.props.onClose();
  };

  initDrawing(canvas) {
    if (!canvas || this.painter) return;

    if (!this.props.datasetimage.label_image) this.props.datasetimage.label_image = {};
    const existingSegmentationUrl =
      this.props.datasetimage.label_image._segmentation_data ||
      this.props.datasetimage.label_image.image;

    this.painter = new Painter({
      canvas,
      container: this.canvasContainerRef.current,
      dx: -3 - this.drawerWidth,
      dy: -2 - this.topBarHeight,
      url: existingSegmentationUrl,
      setDirty: isDirty => (this.props.datasetimage._label_dirty = isDirty),
      getBrushMode: () => this.state.brushMode,
      getBrushColor: () => this.brushColor,
    });
  }

  rgb2hex(rgbArr) {
    return "#" + rgbArr.map(x => ("0" + x.toString(16)).slice(-2)).join("");
  }

  removeSegment = idx => {
    this.setState({segmentCtrlsDisabled: true});

    // store rgbs needed to remove pixels
    // (BEFORE removing segment and loosing this data)
    const segmentRGBs = this.props.segments.map(sgm => sgm.rgb);
    const removedSegmentRGB = segmentRGBs.splice(idx, 1)[0];

    this.props.removeSegment(idx);

    this.painter.removePixels(removedSegmentRGB, segmentRGBs);

    if (this.props.segments.length >= 2) this.setActiveSegment(1);

    this.setState({segmentCtrlsDisabled: false});
  };

  addSegment = async data => {
    await this.props.addSegment(data);
  };

  updateSegment = async data => {
    await this.props.updateSegment(data);
  };

  setActiveSegment = idx => {
    this.brushColor = this.rgb2hex(this.props.segments[idx].rgb);
    this.setState({activeSegmentIdx: idx});
  };

  render() {
    const Sidebar = this.makeSidebar();

    return (
      <mui.Dialog open={this.props.open} onClose={this.handleClose} fullScreen>
        <mui.AppBar position="fixed" style={{zIndex: 12345}}>
          <mui.Toolbar>
            <div style={{flexGrow: 1}}>
              {this.props.datasetimage.id} -{" "}
              <strong>
                {this.props.datasetimage.image.summary.thumb.split("/").slice(-1)[0]}
              </strong>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <sui.Button.Group>
                <sui.Button
                  positive={this.state.brushMode === "draw"}
                  onClick={() => this.setState({brushMode: "draw"})}
                >
                  Draw
                </sui.Button>
                <sui.Button.Or />
                <sui.Button
                  positive={this.state.brushMode === "erase"}
                  onClick={() => this.setState({brushMode: "erase"})}
                >
                  Erase
                </sui.Button>
              </sui.Button.Group>
            </div>
            <mui.IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
              <mui.Icon>close</mui.Icon>
            </mui.IconButton>
          </mui.Toolbar>
        </mui.AppBar>

        <nav
          style={{
            width: this.drawerWidth,
            flexShrink: 0,
          }}
        >
          <mui.Drawer
            style={{
              width: this.drawerWidth,
            }}
            variant="permanent"
            open
          >
            <Sidebar />
          </mui.Drawer>
        </nav>

        <div
          style={{
            position: "fixed",
            top: 64,
            left: this.drawerWidth,
            width: `calc(100% - ${this.drawerWidth}px)`,
            height: "calc(100% - 64px)",
            overflow: "scroll",
          }}
          ref={this.canvasContainerRef}
        >
          <img
            style={{
              width: "auto",
              height: "auto",
              border: "4px solid purple",
            }}
            src={this.props.datasetimage.image.image}
            alt=""
            onLoad={() =>
              this.setState({
                imgLoaded: true,
                imgW: this.imgRef.current.naturalWidth,
                imgH: this.imgRef.current.naturalHeight,
              })
            }
            ref={this.imgRef}
          />
          {this.state.imgLoaded && (
            <canvas
              width={this.state.imgW}
              height={this.state.imgH}
              ref={el => this.initDrawing(el)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: 0.5,
                border: "4px solid transparent",
                cursor: "crosshair",
              }}
            />
          )}
        </div>
        <AddEditSegmentDialog
          {...this.state.addEditSegmentDialog}
          onClose={() =>
            this.setState(s => imm.set(s, "addEditSegmentDialog.open", false))
          }
          key={this.state.addEditSegmentDialog.segmentIdx}
        />
      </mui.Dialog>
    );
  }

  makeSidebar() {
    return mui.withStyles(theme => ({
      toolbar: theme.mixins.toolbar,
    }))(props => (
      <div style={{width: this.drawerWidth}}>
        <div className={props.classes.toolbar} />
        <mui.Divider />
        <mui.List>
          {this.props.segments.slice(1).map((segment, idx) => (
            <mui.ListItem
              button
              key={idx}
              style={
                idx + 1 === this.state.activeSegmentIdx
                  ? {
                      background: getColor(":blue.100")[0],
                    }
                  : {}
              }
              onClick={() => this.setActiveSegment(idx + 1)}
            >
              <mui.ListItemIcon
                style={{marginRight: 0, color: this.rgb2hex(segment.rgb)}}
              >
                <mui.Icon>palette</mui.Icon>
              </mui.ListItemIcon>
              <mui.ListItemText style={{marginRight: 0}}>
                {segment.label}
              </mui.ListItemText>

              <MButton
                icon="more_vert"
                size="small"
                style={{
                  marginRight: -20,
                  minWidth: 32,
                }}
                onClick={event => {
                  console.log("clicked segment opener:", event.currentTarget);
                  const anchorEl = event.currentTarget;
                  const anchorElBox = anchorEl.getBoundingClientRect();
                  this.setState({
                    segmentAnchorEl: event.currentTarget,
                    segmentMenuTop: anchorElBox.top,
                    segmentMenuLeft: anchorElBox.left,
                    selectedSegmentIdx: idx + 1,
                  });
                }}
              />
            </mui.ListItem>
          ))}
        </mui.List>
        <mui.Divider />
        <mui.List>
          <mui.ListItem>
            <mui.Fab
              variant="extended"
              size="small"
              color="secondary"
              aria-label="Add"
              style={{marginLeft: 35}}
              onClick={() =>
                this.setState({
                  addEditSegmentDialog: {
                    dialogTitle: "Add New Segment",
                    open: true,
                    segmentIdx: this.props.segments.length,
                    saveText: "Add",
                    label: "",
                    rgb: [0, 0, 255],
                    onSave: data => {
                      this.props.addSegment({label: data.label, rgb: data.rgb});
                      this.setState(s => imm.set(s, "addEditSegmentDialog.open", false));
                      setTimeout(
                        // allow for props to be updated
                        () => this.setActiveSegment(this.props.segments.length - 1),
                        0
                      );
                    },
                  },
                })
              }
            >
              <mui.Icon>add</mui.Icon>
              Add segment &nbsp;
            </mui.Fab>
          </mui.ListItem>
        </mui.List>
        <SegmentMenu
          anchorEl={this.state.segmentAnchorEl}
          open={!!this.state.segmentAnchorEl}
          onClose={() => this.setState({segmentAnchorEl: null})}
          removeItem={this.removeSegment}
          editItem={idx =>
            this.setState({
              addEditSegmentDialog: {
                dialogTitle: "Update Segment",
                open: true,
                segmentIdx: idx,
                saveText: "Update",
                label: this.props.segments[idx].label,
                rgb: this.props.segments[idx].rgb,
                onSave: data => {
                  this.props.updateSegment(idx, data);
                  this.setState(s => imm.set(s, "addEditSegmentDialog.open", false));
                },
              },
            })
          }
          selectedSegmentIdx={this.state.selectedSegmentIdx}
          segmentMenuTop={this.state.segmentMenuTop}
          segmentMenuLeft={this.state.segmentMenuLeft}
        />
      </div>
    ));
  }
}
