import React from "react";
import PropTypes from "prop-types";
import {default as imm} from "object-path-immutable";

import * as mui from "../../mui-imports.js";

const SegmentMenu = mui.withStyles({})(props => {
  return (
    <mui.Menu
      id="segment-menu"
      style={{
        top: props.segmentMenuTop,
        left: props.segmentMenuLeft,
      }}
      {...imm(props)
        .del("removeItem")
        .del("editItem")
        .del("selectedSegmentIdx")
        .del("segmentMenuTop")
        .del("segmentMenuLeft")
        .value()}
    >
      <mui.MenuItem
        className={props.classes.menuItem}
        onClick={() => {
          props.removeItem(props.selectedSegmentIdx);
          props.onClose();
        }}
      >
        <mui.ListItemIcon className={props.classes.icon}>
          <mui.Icon>close</mui.Icon>
        </mui.ListItemIcon>
        <mui.ListItemText
          classes={{primary: props.classes.primary}}
          inset
          primary="Remove Segment"
        />
      </mui.MenuItem>
      <mui.MenuItem
        className={props.classes.menuItem}
        onClick={() => {
          props.editItem(props.selectedSegmentIdx);
          props.onClose();
        }}
      >
        <mui.ListItemIcon className={props.classes.icon}>
          <mui.Icon>edit</mui.Icon>
        </mui.ListItemIcon>
        <mui.ListItemText
          classes={{primary: props.classes.primary}}
          inset
          primary="Edit segment"
        />
      </mui.MenuItem>
    </mui.Menu>
  );
});

SegmentMenu.propTypes = {
  anchorEl: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  removeItem: PropTypes.func.isRequired,
  editItem: PropTypes.func.isRequired,
  selectedSegmentIdx: PropTypes.number,
  segmentMenuTop: PropTypes.number,
  segmentMenuLeft: PropTypes.number,
};

export default SegmentMenu;
