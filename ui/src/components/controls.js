import React from "react";
import {Link} from "react-router-dom";

import * as mui from "../mui-imports.js";
import * as sui from "semantic-ui-react";
// import {Typography} from "@material-ui/core/styles/colorManipulator/";

/**
 *
 * @param {string} cstr
 *    eg. ":purple.500|purple.700", "#F0F0F0|cyan"
 * @return {[string]} [color, hoverColor]
 */
export function getColor(cstr) {
  let color, hoverColor;
  if (cstr[0] === ":") {
    const [colorStr, hoverColorStr] = cstr.slice(1).split("|");
    const [hue, shade] = colorStr.split(".");
    color = mui[hue][shade || 500];
    if (hoverColorStr) {
      let [hoverHue, hoverShade] = hoverColorStr.split(".");
      hoverColor = mui[hoverHue][hoverShade];
    } else {
      hoverColor = mui[hue][+(shade || 500) + 200];
    }
  } else {
    [color, hoverColor] = cstr.split("|");
  }
  return [color, hoverColor];
}

export const MButton = ({
  color,
  textColor,
  icon,
  iconRight,
  children,
  linkTo,
  loading,
  ...defaultProps
}) => {
  const styles = {
    "&:hover": {},
  };

  if (color) {
    if (["default", "inherit", "primary", "secondary"].indexOf(color) !== -1) {
      defaultProps.color = color;
    } else {
      let [col, hoverCol] = getColor(color);
      const colKey =
        defaultProps.variant === "contained" ? "backgroundColor" : "borderColor";
      styles[colKey] = col;
      if (hoverCol) {
        styles["&:hover"][colKey] = hoverCol;
      }
    }
  }

  if (textColor) {
    let [textCol, textHoverCol] = getColor(textColor);
    styles.color = textCol;
    if (textHoverCol) {
      styles["&:hover"].color = textHoverCol;
    }
  }

  let iconEl;
  if (icon) {
    if (icon.indexOf("sui.") === 0) {
      iconEl = <sui.Icon name={icon.slice(4)} style={{marginTop: "-9px"}} />;
    } else {
      if (icon.indexOf("fa-") === 0) {
        iconEl = (
          <mui.Icon
            className={`fas ${icon}`}
            style={{
              fontSize: "1.1rem",
              width: "1.5em",
              marginRight: 3,
            }}
          />
        );
      } else {
        iconEl = (
          <>
            <mui.Icon>{icon}</mui.Icon>&nbsp;
          </>
        );
      }
    }
  }

  let loader;
  if (loading) {
    // loader = "...";
    defaultProps.disabled = true;
    const CustomLoader = mui.withStyles(theme => ({
      root: {
        // color: mui.green[500],
        marginRight: 6,
      },
    }))(props => <mui.CircularProgress className={props.classes.root} {...props} />);
    loader = <CustomLoader size={18} />;
  }

  const CustomButton = mui.withStyles(theme => ({
    root: {
      ...styles,
      color:
        styles.color ||
        (styles.backgroundColor
          ? theme.palette.getContrastText(styles.backgroundColor)
          : undefined),
    },
  }))(props => (
    <mui.Button
      className={`${props.classes.root} ${props.className || ""}`}
      {...{...defaultProps, ...props}}
    />
  ));

  const r = (
    <CustomButton>
      {!iconRight && (loading ? loader : icon && iconEl)}
      {/* {loading ? loader : icon && !iconRight && iconEl} */}
      {children}
      {/* {loading ? loader : icon && iconRight && iconEl} */}
      {iconRight && (loading ? loader : icon && iconEl)}
    </CustomButton>
  );

  return linkTo ? <Link to={linkTo}>{r}</Link> : r;
};

export const MPaper = mui.withStyles(theme => ({
  root: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
  },
}))(mui.Paper);

export const SelectDialog = mui.withStyles(theme => ({
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
}))(props => {
  const {classes, onClose, title, items, renderItem, ...other} = props;

  return (
    <mui.Dialog
      onClose={() => onClose(null)}
      aria-labelledby="simple-dialog-title"
      className={classes.root}
      {...other}
    >
      <mui.DialogTitle id="simple-dialog-title" className={classes.dialogTitle}>
        {title}
        <mui.IconButton
          aria-label="Close"
          className={classes.closeButton}
          onClick={() => onClose(null)}
        >
          <mui.Icon>close</mui.Icon>
        </mui.IconButton>
      </mui.DialogTitle>
      <mui.List>{items.map(renderItem)}</mui.List>
    </mui.Dialog>
  );
});
