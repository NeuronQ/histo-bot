import React, {Component} from "react";
// import PropTypes from "prop-types";
import {Route, Switch} from "react-router-dom";
import {default as imm} from "object-path-immutable";

import * as mui from "./mui-imports.js";
import PageDashboard from "./PageDashboard/PageDashboard.js";
import PageModels from "./PageModels/PageModels.js";
import PageAnalyses from "./PageAnalyses/PageAnalyses.js";
import PageTrainModel from "./PageTrainModel/PageTrainModel.js";
import PageCreateModel from "./PageCreateModel/PageCreateModel.js";
import "./App.scss";
import {Users} from "./api/api.js";

const styles = theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  paper: {
    padding: theme.spacing.unit * 2,
  },
  grow: {
    flexGrow: 1,
  },
});

class App extends Component {
  static propTypes = {};

  state = {
    DATA: {
      user: null,
      lastCreatedModel: null,
    },
  };

  componentDidMount() {
    Users.getSelf().then(res => this.setState({DATA: {user: res.data}}));
  }

  setLastCreatedModel = modelData => imm.set(this.state, "DATA.modelData", modelData);

  render() {
    const {classes} = this.props;

    if (!this.state.DATA.user) return <p>Loading...</p>;

    return (
      <>
        <mui.CssBaseline />
        <div className="App">
          <mui.AppBar position="static">
            <mui.Toolbar>
              <mui.Typography variant="h6" color="inherit" className={classes.grow}>
                HBot
              </mui.Typography>
              <mui.Button color="inherit">Logout</mui.Button>
            </mui.Toolbar>
          </mui.AppBar>

          <div className="App-container">
            <div>
              <Route
                children={({match, history, location}) => (
                  <mui.Tabs
                    value={"/" + location.pathname.split("/")[1]}
                    onChange={(ev, path) => history.push(path)}
                  >
                    <mui.Tab value="/" label="Dashboard" />
                    <mui.Tab value="/models" label="Models" />
                    <mui.Tab value="/analyses" label="Analyses" />
                  </mui.Tabs>
                )}
              />
              <br />

              <Switch>
                <Route exact path="/" component={PageDashboard} />
                <Route exact path="/models" component={PageModels} />
                <Route
                  path="/models/new"
                  render={props => (
                    <PageCreateModel
                      {...{
                        ...props,
                        setLastCreatedModel: this.setLastCreatedModel,
                      }}
                    />
                  )}
                />
                <Route path="/models/:modelId/train" component={PageTrainModel} />
                <Route exact path="/analyses" component={PageAnalyses} />
              </Switch>
            </div>
          </div>

          {/*<br />*/}
          {/*<pre>FOOZ: {process.env.REACT_APP_FOOZ}</pre>*/}

          {/*<br />*/}
          {/*<Route*/}
          {/*  children={props => {*/}
          {/*    window._h = props.history;*/}
          {/*    return <pre>{JSON.stringify(props, null, 2)}</pre>;*/}
          {/*  }}*/}
          {/*/>*/}
        </div>
      </>
    );
  }
}

export default mui.withStyles(styles)(App);
