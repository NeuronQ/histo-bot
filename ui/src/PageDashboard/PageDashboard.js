import React, {Component} from "react";
// import PropTypes from "prop-types";
import {Link} from "react-router-dom";
import classNames from "classnames";

import * as mui from "../mui-imports.js";
import * as sui from "semantic-ui-react";

import styles from "./PageDashboard.module.scss";

class PageDashboard extends Component {
  static propTypes = {};

  render() {
    return (
      <div className={classNames("Page", styles.Page)}>
        <mui.Paper square>
          <sui.Segment
            style={{
              width: "100%",
              textAlign: "center",
              border: 0,
              boxShadow: "none",
            }}
          >
            <sui.Grid columns={2} relaxed="very" stackable>
              <sui.Grid.Column>
                <Link to="/models">
                  <mui.Button variant="contained" color="primary">
                    Models
                  </mui.Button>
                </Link>
              </sui.Grid.Column>

              <sui.Grid.Column verticalAlign="middle">
                <Link to="/analyses">
                  <mui.Button variant="contained" color="primary">
                    Analyses
                  </mui.Button>
                </Link>
              </sui.Grid.Column>
            </sui.Grid>

            <sui.Divider vertical>&or;</sui.Divider>
          </sui.Segment>
        </mui.Paper>
      </div>
    );
  }
}

export default PageDashboard;
