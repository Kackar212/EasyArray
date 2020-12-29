function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function isPrimitive(value) {
  return Object(value) !== value;
}

function isNumeric(value) {
  return !Number.isNaN(Number(value));
}

function isString(value) {
  return typeof value === 'string';
}

function isEqual(obj, obj1) {
  if (isPrimitive(obj) && isPrimitive(obj1)) return obj === obj1;
  if (obj === obj1) return true;
  if (!obj || !obj1) return false;

  const objKeys = Object.keys(obj);
  const obj1Keys = Object.keys(obj1);
  if (objKeys.length !== obj1Keys.length) return false;
  if (!objKeys.every((key, index) => key === obj1Keys[index])) return false;

  if (obj.isPrototypeOf(obj1) || obj1.isPrototypeOf(obj)) return false;

  for (const prop in obj) {
    if (isObject(obj[prop]) && isObject(obj1[prop])) {
      if (!isEqual(obj[prop], obj1[prop])) return false;
    } else if (obj[prop] !== obj1[prop]) {
      return false;
    }
  }

  return true;
}

function getFromPath(object, path) {
  const keys = String(path).split('.');
  const mainKey = keys.shift();

  let curr = object[mainKey];
  keys.forEach(key => {
    curr = curr[key];
  });

  return curr;
}

function objectIncludes(arr, value, prop) {
  return arr.some(item => isEqual(item[prop], value));
}

function random(min, max, inclusive = false) {
  return Math.floor(Math.random() * (max - min + Number(inclusive) + min));
}

function getFromMap(map, key) {
  key = [...map.keys()].find(item => isEqual(key, item));
  return map.get(key);
}

function put(path, value, obj = {}) {
  const keys = path.split('.');
  let curr = obj;

  keys.forEach((key, i) => {
    const index = key.match(/(?<=\[)(.*)(?=\])/g);
    if (index) {
      const prop = key.match(/(\w)(?=\[(.*)\])/g)[0];
      if (!curr[prop]) {
        curr[prop] = [];
      }

      curr = curr[prop];

      if (!curr[index[0]]) {
        curr[index[0]] = !isNumeric(keys[i + 1]) ? {} : [];
      }

      if (i === keys.length - 1) {
        curr[index[0]] = value;
      }

      curr = curr[index[0]];
    } else {
      if (i === keys.length - 1) {
        curr[key] = value;
      } else {
        if (!curr[key]) {
          curr[key] = {};
        }

        curr = curr[key];
      }
    }
  });

  return obj;
}

export { isEqual, objectIncludes, isNumeric, isString, isObject, random, getFromPath, getFromMap, put };