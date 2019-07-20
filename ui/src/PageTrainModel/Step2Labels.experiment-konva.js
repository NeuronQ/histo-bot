import React, { Component } from "react";
import { Link, Route, Switch } from "react-router-dom";
import classNames from "classnames";
import queryString from "query-string";
import * as sui from "semantic-ui-react";

import Konva from "konva";
import { Stage, Layer, Rect, Text } from "react-konva";

import * as mui from "../mui-imports.js";
import { MButton, MPaper } from "../components";
import { throws } from "assert";

const image = {
  id: 0,
  imgThumbSrc: "/IHC S100 18EH20842__00.png",
  maskThumbSrc: "/IHC S100 18EH20842__00_S.png",
  imgSrc: "/IHC S100 18EH20842.png",
  maskSrc: "/IHC S100 18EH20842_S.png",
  score: "91.20%",
};

export default class Step2Labels extends Component {
  state = {
    img: image,
    imgW: null,
    imgH: null,
    imgLoaded: false,
  };

  constructor(props) {
    super(props);
    this.imgRef = React.createRef();
    // this.konvaStageRef = React.createRef();
  }

  initDrawing(stage) {
    console.log("...initing drawing");
    console.log("stage:", stage);

    var layer = new Konva.Layer();
    stage.add(layer);

    var canvas = document.createElement("canvas");
    canvas.width = stage.width();
    canvas.height = stage.height();

    // created canvas we can add to layer as "Konva.Image" element
    var image = new Konva.Image({
      image: canvas,
      x: 0,
      y: 0,
    });
    layer.add(image);
    stage.draw();

    var cx = canvas.getContext("2d");
    cx.strokeStyle = "#df4b26";
    cx.lineJoin = "round";
    cx.lineWidth = 4;

    var isPaint = false;
    var lastPointerPosition;
    var mode = "brush";

    image.on("mousedown touchstart", function() {
      isPaint = true;
      lastPointerPosition = stage.getPointerPosition();
    });

    stage.addEventListener("mouseup touchend", function() {
      isPaint = false;
    });

    // and core function - drawing
    stage.addEventListener("mousemove touchmove", function() {
      if (!isPaint) {
        return;
      }

      if (mode === "brush") {
        cx.globalCompositeOperation = "source-over";
      }
      if (mode === "eraser") {
        cx.globalCompositeOperation = "destination-out";
      }

      cx.beginPath();

      var localPos = {
        x: lastPointerPosition.x - image.x(),
        y: lastPointerPosition.y - image.y(),
      };
      cx.moveTo(localPos.x, localPos.y);
      var pos = stage.getPointerPosition();
      localPos = {
        x: pos.x - image.x(),
        y: pos.y - image.y(),
      };
      cx.lineTo(localPos.x, localPos.y);
      cx.closePath();
      cx.stroke();

      lastPointerPosition = pos;
      layer.batchDraw();
    });

    // mixing konva with raw canvas drawing doesn't seem to work:
    // canvas.onmousedown = function(ev) {
    //   isPaint = true;
    //   cx.moveTo(ev.clientX - 8, ev.clientY - 8);
    //   cx.lineTo(ev.clientX - 8 + 1, ev.clientY - 8 + 1);
    //   cx.closePath();
    //   cx.stroke();
    //   layer.batchDraw();
    // };

    // canvas.onmousemove = function(ev) {
    //   if (!isPaint) return;
    //   cx.lineTo(ev.clientX - 8, ev.clientY - 8);
    //   cx.stroke();
    // };

    // canvas.onmouseup = function(ev) {
    //   isPaint = true;
    // };
  }

  render() {
    const { img } = this.state;

    return (
      <>
        <MPaper square>
          <pre>[ step 2 - labels ]</pre>
        </MPaper>
        <mui.Dialog
          fullScreen
          open={true}
          onClose={() => this.setState({ zoomDialogOpen: false })}
        >
          <mui.AppBar>
            <mui.Toolbar>
              <div style={{ flexGrow: 1 }}>
                {img.id} -{" "}
                <strong>{img.imgThumbSrc.split("/").slice(-1)[0]}</strong>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Show segmentation:
                <mui.Switch
                  checked={this.state.zoomDialogShowSegmentation}
                  onChange={(ev, checked) =>
                    this.setState({ zoomDialogShowSegmentation: checked })
                  }
                  aria-label="ShowLabels"
                />
              </div>
              <mui.IconButton
                color="inherit"
                onClick={() => this.setState({ zoomDialogOpen: false })}
                aria-label="Close"
              >
                <mui.Icon>close</mui.Icon>
              </mui.IconButton>
            </mui.Toolbar>
            <div
              style={{
                position: "fixed",
                // background: "lime",
                marginTop: 64,
                width: "100%",
                height: "calc(100% - 64px)",
                overflow: "scroll",
              }}
            >
              <img
                style={{
                  width: "auto",
                  height: "auto",
                  border: "4px solid purple",
                }}
                src={img.imgSrc}
                alt=""
                onLoad={() => {
                  console.log(
                    "...image loaded",
                    this.imgRef.current.naturalWidth,
                    this.imgRef.current.naturalHeight
                  );
                  this.setState({
                    imgLoaded: true,
                    imgW: this.imgRef.current.naturalWidth,
                    imgH: this.imgRef.current.naturalHeight,
                  });
                }}
                ref={this.imgRef}
              />
              {this.state.imgLoaded && (
                <Stage
                  ref={stage => this.initDrawing(stage)}
                  width={this.state.imgW}
                  height={this.state.imgH}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  <Layer>
                    <Text text="Try click on rect" />
                  </Layer>
                  <Layer name="segmentation" />
                </Stage>
              )}
            </div>
          </mui.AppBar>
        </mui.Dialog>
      </>
    );
  }
}
