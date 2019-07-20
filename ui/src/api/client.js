import axios from "axios";

export const baseURL = process.env.REACT_APP_BASE_API_URL || "/api/v1";

const headers = {
  "Content-Type": "application/json",
};
if (process.env.REACT_APP_LOCAL_DEV_USER && process.env.REACT_APP_LOCAL_DEV_PWD) {
  headers["Authorization"] = `Basic ${btoa(
    process.env.REACT_APP_LOCAL_DEV_USER + ":" + process.env.REACT_APP_LOCAL_DEV_PWD
  )}`;
}

export const apiClient = axios.create({
  baseURL,
  headers,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  validateStatus: status => {
    const unauthorizedStatus = 401;
    const forbiddenStatus = 403;
    if (
      (status === unauthorizedStatus || status === forbiddenStatus) &&
      window.location.host.indexOf(":") === -1
    ) {
      window.location.pathname = "/accounts/login/";
    }
    return status >= 200 && status < 400;
  },
});

window._apiClient = apiClient; // DEBUG
