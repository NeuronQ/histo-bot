import {default as imm} from "object-path-immutable";

export const asSet = x => (x instanceof Set ? x : new Set(x));

export class xset {
  static isSuperset(set, subset) {
    set = asSet(set);
    subset = asSet(subset);
    for (var elem of subset) {
      if (!set.has(elem)) {
        return false;
      }
    }
    return true;
  }

  static union(setA, setB) {
    setA = asSet(setA);
    setB = asSet(setB);
    var _union = new Set(setA);
    for (var elem of setB) {
      _union.add(elem);
    }
    return _union;
  }

  static intersection(setA, setB) {
    setA = asSet(setA);
    setB = asSet(setB);
    var _intersection = new Set();
    for (var elem of setB) {
      if (setA.has(elem)) {
        _intersection.add(elem);
      }
    }
    return _intersection;
  }

  static symmetricDifference(setA, setB) {
    setA = asSet(setA);
    setB = asSet(setB);
    var _difference = new Set(setA);
    for (var elem of setB) {
      if (_difference.has(elem)) {
        _difference.delete(elem);
      } else {
        _difference.add(elem);
      }
    }
    return _difference;
  }

  static difference(setA, setB) {
    setA = asSet(setA);
    setB = asSet(setB);
    var _difference = new Set(setA);
    for (var elem of setB) {
      _difference.delete(elem);
    }
    return _difference;
  }
}

/**
 * Map over smth. that either has a .map(...), or is convertible to Array.
 *
 * Useful when you want to treat array an interators like MapIterator the same.
 */
export const xmap = (xs, ...args) => {
  if (xs.map) return xs.map(...args);
  return Array.from(xs).map(...args);
};

/**
 * Map over smth. that either has an .entries(), or is a "POJO used as a map".
 *
 * Useful when you want to treap POJO (plain javascript opbjects) used as maps
 * similarly with actual Map objects. Also handles the case where .entries()
 * returns a MapIterator, or smth. else convertible to Array via Array.from.
 */
export const xomap = (xs, ...args) => {
  if (xs.entries) {
    const entries = xs.entries();
    return entries.map ? entries.map(...args) : Array.from(entries).map(...args);
  }
  return Object.entries(xs).map(...args);
};

export const getFileContents = file => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = ev => {
      console.log("read file: ev.target.result");

      resolve(ev.target.result);
    };
    reader.onerror = err => {
      reader.abort();
      reject(err);
    };
    reader.readAsBinaryString(file);
  });
};

/**
 * Augment a React Component instance with methods for manipulating state
 * fields containing arrays.
 *
 * Intended to be called at the end of the constructor.
 *
 * Adds:
 * - add{MyField}(data)
 * - remove{MyField}(idx)
 * - replace{MyField}(idx)
 * - update{MyField}(idx)
 *
 * By default {MyField} is fieldName singular (only basic "s" plurals are
 * undrestood by it) and capitalized, but to change it just provide
 * an `Array [fieldName, "NicerName"]` instead of `fieldName`.
 */
export const augmentWithStateFieldArrayMethods = (obj, path, suffix) => {
  obj["add" + suffix] = data => obj.setState(s => imm.push(s, path, data));

  obj["remove" + suffix] = idx => obj.setState(s => imm.del(s, `${path}.${idx}`));

  obj["replace" + suffix] = (idx, data) =>
    obj.setState(s => imm.set(s, `${path}.${idx}`, data));

  obj["update" + suffix] = (idx, data) =>
    obj.setState(s => imm.merge(s, `${path}.${idx}`, data));
};

export const base64_to_blob = str => {
  const [_data, mimeType, _base64, base64Data] = str.split(/[:;,]/, 4); // eslint-disable-line
  const binData = atob(base64Data);
  const arr = [];
  for (let i = 0, n = binData.length; i < n; i++) {
    arr.push(binData.charCodeAt(i));
  }
  return new Blob([new Uint8Array(arr)], {type: mimeType});
};
