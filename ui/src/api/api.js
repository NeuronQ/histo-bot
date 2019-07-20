import {apiClient} from "./client.js";
import ModelManager from "./manager.js";
import {xset, base64_to_blob} from "../utils.js";

export class APIResponseError extends Error {
  constructor(response, ...params) {
    super(...params);
    if (Error.captureStackTrace) Error.captureStackTrace(this, APIResponseError);
    this.message = `API error (HTTP code ${response.status}): ${this.message}`;
    this.response = response;
  }
}

export class Users extends ModelManager {
  static readOnlyFields = new Set(["email"]);

  static getSelf() {
    return apiClient.get("/self/");
  }
}

export class MLModels extends ModelManager {
  static get(id) {
    return apiClient.get(`/models/${id}/`);
  }

  static update(data) {
    return apiClient.patch(`/models/${data.id}/`, this._withoutNullIds(data));
  }

  static create(data) {
    return apiClient.post("/models/", data);
  }
}

export class Datasets extends ModelManager {
  static readOnlyFields = xset.union(ModelManager.readOnlyFields, ["datasetimages"]);

  static fromApiData(data) {
    const res = ModelManager.fromApiData(data);
    res.datasetimages = res.datasetimages.map(dsi => ModelManager.fromApiData(dsi));
    return res;
  }

  static list() {
    return apiClient.get("/datasets/");
  }

  static create(data) {
    return apiClient.post("/datasets/", data);
  }
}

class BaseImages extends ModelManager {
  static _makeFormData(data) {
    const formData = new FormData();
    for (let [fld, val] of Object.entries(data)) {
      if (fld === "image") continue;
      formData.append(fld, val);
    }

    if (data.image.file_contents) {
      let imageData = data.image.file_contents;
      if (typeof imageData === "string" && imageData.slice(0, 5) === "data:") {
        imageData = base64_to_blob(imageData);
      }
      formData.append("image", imageData, data.image.file_name || "_.png");
    } else if (data.image.file instanceof File) {
      formData.append(
        "image",
        data.image.file,
        data.image.file_name || data.image.file.name
      );
    }
    return formData;
  }

  static create(data) {
    const formData = this._makeFormData(data);
    return apiClient.post(this.endpointUrl, formData, {
      headers: {
        "content-type": "multipart/form-data",
      },
    });
  }

  static update(data) {
    const formData = this._makeFormData(data);
    return apiClient.patch(`${this.endpointUrl}${data.id}/`, formData, {
      headers: {
        "content-type": "multipart/form-data",
      },
    });
  }
}

export class Images extends BaseImages {
  static endpointUrl = "/images/";
}

export class LabelImages extends BaseImages {
  static endpointUrl = "/label-images/";
}

export class TrainingSessions extends ModelManager {
  static get(id) {
    return apiClient.get(`/training-sessions/${id}/`);
  }

  static create(data) {
    return apiClient.post(`/training-sessions/`, this._withoutNullIds(data));
  }
}

export const getWSRootUrl = () => {
  if (process.env.REACT_APP_BASE_WS_URL) return process.env.REACT_APP_BASE_WS_URL;
  return (
    (window.location.protocol === "https:" ? "wss:" : "ws:") +
    "//" +
    window.location.host +
    "/ws"
  );
};
