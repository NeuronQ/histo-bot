import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import {BrowserRouter as Router} from "react-router-dom";
import {_} from "underscore";

import * as _utils_ from "./utils.js";
import "./styles/index.scss";

import "semantic-ui-css/semantic.min.css";

// DEBUG/DEV helpers
window._ = _;
window._utils_ = _utils_;

ReactDOM.render(
  <Router>
    <App />
  </Router>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
