import React, {Component} from "react";
import PropTypes from "prop-types";
import queryString from "query-string";
import * as sui from "semantic-ui-react";

import * as mui from "../mui-imports.js";
import {MButton, ResultThumbs} from "../components";
import {TrainingSessions, getWSRootUrl} from "../api/api.js";

const resultImages = [
  {
    id: 0,
    imgThumbSrc: "/IHC S100 18EH20842__00.png",
    maskThumbSrc: "/IHC S100 18EH20842__00_S.png",
    imgSrc: "/IHC S100 18EH20842.png",
    maskSrc: "/IHC S100 18EH20842_S.png",
    score: "91.20%",
  },
  {
    id: 1,
    imgThumbSrc: "/IHC S100 18EH20842__00.png",
    maskThumbSrc: "/IHC S100 18EH20842__00_S.png",
    imgSrc: "/IHC S100 18EH20842.png",
    maskSrc: "/IHC S100 18EH20842_S.png",
    score: "23.10%",
  },
];
for (let i = 0; i < 2; i++) resultImages.push(...resultImages);

export default class Step3Training extends Component {
  static propTypes = {
    model: PropTypes.object,
    trainingDatasets: PropTypes.arrayOf(Object).isRequired,
  };

  state = {
    epochs: 10,
    trainingInProgress: false,
    trainingProgress: 0,
  };

  // trainingSessionId = null;
  trainingSessionId = 1;

  componentWillUnmount() {}

  simulateTraining() {
    this.setState({
      trainingInProgress: true,
      trainingProgress: 0,
    });
    setTimeout(() => {
      this.setState({
        trainingInProgress: true,
        trainingProgress: 60,
      });
      setTimeout(
        () =>
          this.setState({
            trainingInProgress: false,
            trainingProgress: 100,
          }),
        3000
      );
    }, 1000);
  }

  train = async () => {
    const nEpochs = 10; // DEBUG

    this.setState({
      trainingInProgress: true,
      trainingProgress: 0,
    });

    // - check if training session is created
    // - create if not
    if (!this.trainingSessionId) {
      const qs = queryString.parse(this.props.location.search);
      if (qs.ts) {
        this.trainingSessionId = +qs.ts;
      } else {
        const res = await TrainingSessions.create({
          model_id: this.props.model.id,
          datasets: this.props.trainingDatasets.map(ds => ds.id),
        });
        this.trainingSessionId = res.data.id;
        window.history.replaceState({}, "", "?ts=" + this.trainingSessionId);
      }
    }
    // - connect to websocket route with session id
    const wsPromise = new Promise((resolve, reject) => {
      console.log("~ websocket connecting");
      this._ws = new WebSocket(
        getWSRootUrl() +
          `/train/model-${this.props.model.id}/ts-${this.trainingSessionId}/`
      );
      console.log("~ websocket created", this._ws);
      this._ws.onerror = ev => {
        console.log("~ ws error", ev);
        reject(ev);
      };
      this._ws.onopen = ev => {
        console.log("~ ws open");
        resolve(this._ws, ev);
      };
    });
    const ws = await wsPromise;
    console.log("~ websocket connected", ws);
    // - send ws train command
    ws.send(
      JSON.stringify({
        type: "train",
        // __fake__: true,
        dataset_ids: [2],
        params: {epochs: 10},
      })
    );
    // - listen until progress 100% or error
    ws.onmessage = ev => {
      const data = JSON.parse(ev.data);
      console.log("=== received websocket message:", data);
      if (data.type === "training_progress") {
        this.setState({
          trainingInProgress: data.epoch === nEpochs ? false : true,
          trainingProgress: (data.epoch / nEpochs) * 100,
        });
      }
    };
    // - close websocket
    ws.onclose = ev => {
      this.setState({trainingInProgress: false});
      console.log("~ websocket closed", ev);
    };
  };

  render() {
    return (
      <>
        <mui.Card square>
          <mui.CardContent>
            <div>
              <label>
                Epochs: &nbsp;&nbsp;
                <sui.Input
                  value={this.state.epochs}
                  type="number"
                  onChange={ev => this.setState({epochs: +ev.target.value})}
                  style={{width: 80}}
                />
              </label>

              <MButton
                children="Train"
                color=":blue"
                variant="contained"
                icon="fa-cogs"
                style={{float: "right", width: 124}}
                loading={this.state.trainingInProgress}
                onClick={this.train}
              />
            </div>
            {this.state.trainingInProgress && (
              <mui.LinearProgress
                variant="determinate"
                value={this.state.trainingProgress}
                style={{marginTop: 16}}
              />
            )}
          </mui.CardContent>
        </mui.Card>

        <br />
        <mui.Card square style={{border: `1px solid ${mui.blue[500]}`}}>
          <mui.CardContent>
            <div>
              <div style={{float: "right"}}>
                <MButton
                  children="Save"
                  color=":green"
                  textColor="#fff"
                  variant="contained"
                  icon="save_alt"
                  style={{width: 100, marginBottom: 16}}
                />
                <br />
                <MButton
                  children="Discard"
                  textColor=":red"
                  icon="delete_outline"
                  style={{width: 100}}
                />
              </div>
              <p>
                <code>2019-02-03 18:42</code>
              </p>
              <p>
                <strong>10 Epochs</strong>
                <br />
                Results - accurracy:{" "}
                <strong>
                  <code>83.12%</code>
                </strong>
              </p>
              <br />
              <br />
              <div
                style={{
                  padding: 16,
                  background: "#f4f0fa",
                }}
              >
                <ResultThumbs items={resultImages} />
              </div>
            </div>
          </mui.CardContent>
        </mui.Card>
      </>
    );
  }
}
