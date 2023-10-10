class Partial {
  constructor(value) {
    return new Proxy({ partial: this, value }, {
      get: Partial.#getTrap,
      ownKeys(target) {
        return Object.keys(target.value);
      },
    });
  }

  static #getTrap(target, propertyKey, receiver) {
    if (propertyKey === 'partial') return target.partial;

    const result = target.value[propertyKey];
    return typeof result === 'undefined' ? target[propertyKey] : result;
  }

  static create(value) {
    return new Partial(value);
  }

  static isPartial(value) {
    return value.partial instanceof Partial;
  }
}

const DIRECTION = {
  LEFT: 1,
  RIGHT: -1,
}

function createPartial(value) {
  return Partial.create(value);
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function isNumeric(value) {
  return !Number.isNaN(Number(value));
}

function isString(value) {
  return typeof value === 'string';
}

function isPrimitive(value) {
  return Object(value) !== value;
}

function isEqual(obj, obj1) {
  if (isPrimitive(obj)) return obj === obj1;
  if (obj === obj1) return true;
  if (typeof obj !== typeof obj1) return false;
  if (obj.constructor !== obj1.constructor) return false;

  const [isObjPartial, isObj1Partial] = [Partial.isPartial(obj), Partial.isPartial(obj1)]
  const isAnyPartial = isObjPartial || isObj1Partial;

  const objKeys = Reflect.ownKeys(obj);
  const obj1Keys = Reflect.ownKeys(obj1);

  if (!isAnyPartial) {
    if (objKeys.length !== obj1Keys.length) return false;
    if (!objKeys.every((key, index) => key === obj1Keys[index])) return false;
  }

  if (obj.prototype?.isPrototypeOf(obj1) || obj1.prototype?.isPrototypeOf(obj)) return false;

  const keys = objKeys.length > obj1Keys.length ? obj1Keys : objKeys;
  for (const prop of keys) {
    if (isObject(obj[prop]) && isObject(obj1[prop])) {
      if (!isEqual(obj[prop], obj1[prop])) return false;
    } else if (obj[prop] !== obj1[prop]) {
      return false;
    }
  }

  return true;
}

function getFromPath(object, path) {
  if (!path) return object;

  const keys = String(path).split('.');

  let curr = object;
  if (!isObject(curr)) return curr;

  keys.forEach(key => {
    if (isNumeric(key) && Number(key) < 0) {
      key = curr.length + Number(key);
    }

    curr = curr[key];
  });

  return curr;
}

function hasOwnProperty(obj, path) {
  const keys = path.split('.');
  const lastKey = keys.pop();

  let curr = getFromPath(obj, keys.join('.'));

  return curr.hasOwnProperty(lastKey);
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

export { isEqual, objectIncludes, isNumeric, isString, isObject, random, getFromPath, hasOwnProperty, getFromMap, put, Partial, createPartial, DIRECTION };