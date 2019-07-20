import React, { Component } from "react";

import * as mui from "../mui-imports.js";

import styles from "./ResultThumbs.module.scss";

class ResultThumbs extends Component {
  state = {
    zoomDialogOpen: false,
    zoomedImage: null,
    zoomDialogShowSegmentation: false,
  };

  render() {
    const { items } = this.props;
    const { zoomedImage } = this.state;

    return (
      <>
        <div className={styles.root}>
          {items.map((image, idx) => (
            <div
              key={image.id * 100 + idx}
              className={styles.item}
              onClick={() =>
                this.setState({
                  zoomedImage: image,
                  zoomDialogOpen: true,
                  zoomDialogShowSegmentation: true,
                })
              }
            >
              <img
                src={image.imgThumbSrc}
                alt={image.id}
                className={styles.img}
              />
              <img
                src={image.maskThumbSrc}
                alt={image.id}
                className={styles.mask}
              />
              <div className={styles.score}>
                <code>{image.score}</code>
              </div>
            </div>
          ))}
        </div>

        {this.state.zoomDialogOpen && this.state.zoomedImage && (
          <mui.Dialog
            fullScreen
            open={this.state.zoomDialogOpen}
            onClose={() => this.setState({ zoomDialogOpen: false })}
          >
            <mui.AppBar>
              <mui.Toolbar>
                <div style={{ flexGrow: 1 }}>
                  {zoomedImage.id} -{" "}
                  <strong>
                    {zoomedImage.imgThumbSrc.split("/").slice(-1)[0]}
                  </strong>
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
            </mui.AppBar>
            <div className={styles.ZoomDialogContainer}>
              <img
                className={styles.ZoomDialogImg}
                src={zoomedImage.imgSrc}
                alt=""
              />
              {this.state.zoomDialogShowSegmentation && (
                <img
                  className={styles.ZoomDialogThumb}
                  src={zoomedImage.maskSrc}
                  alt=""
                />
              )}
            </div>
          </mui.Dialog>
        )}
      </>
    );
  }
}

export default ResultThumbs;
