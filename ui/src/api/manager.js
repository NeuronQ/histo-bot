export default class ModelManager {
  static defaultReadOnlyFields = new Set(["created_at", "updated_at"]);
  static defaultConversions = {
    created_at: s => new Date(s),
    updated_at: s => new Date(s),
  };
  static skipUnderscorePrefixed = true;

  static _withoutNullIds(data) {
    return Object.keys(data).reduce(
      (acc, k) => (k.match(/_id$/) && data[k] === null ? acc : {...acc, [k]: data[k]}),
      {}
    );
  }

  static fromApiData(data) {
    const res = {...data};
    for (const [fld, conv] of Object.entries(this.defaultConversions)) {
      res[fld] = conv(res[fld]);
    }
    return res;
  }

  static toApiData(obj) {
    const out = {};
    for (let k of Object.keys(obj)) {
      if (this.readOnlyFields.has(k)) continue;
      if (this.skipUnderscorePrefixed && k[0] === "_") continue;
      out[k] = obj[k];
    }
    return out;
  }

  static;
}
