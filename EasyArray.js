import {
  isEqual,
  objectIncludes,
  isString,
  random,
  getFromPath,
  put,
  getFromMap,
  hasOwnProperty, Partial, isObject, DIRECTION,
} from './helpers.js';

class Collection extends Array {
  constructor(...array) {
    super(...array);
  }

  at(path = '0') {
    return getFromPath(this, path);
  }

  chunk(size) {
    const chunks = Collection.create();
    for (let i = 0; i < this.length; i += size) {
      chunks.push(this.slice(i, size + i));
    }

    return chunks;
  }

  split(splitter) {
    return this.map((item) => Collection.from(item.split(splitter)));
  }

  deepReplace(searchValue, replaceValue, createPath = (index) => index.toString()) {
    let createPathCopy = createPath;
    if (Array.isArray(createPath())) {
      createPathCopy = index => createPath(index).join('.');
    }

    for (let i = 0; i < this.length; i++) {
      const path = createPathCopy(i);

      if (isEqual(getFromPath(this, path), searchValue)) {
        put(path, replaceValue, this);
      }
    }

    return this;
  }

  replace(searchValue, replaceValue, replaceAll = false) {
    let i = 0;

    for (const item of this) {
      if (isEqual(item, searchValue)) {
        this[i] = replaceValue;
        if (!replaceAll) break;
      }

      i += 1;
    }

    return this;
  }

  replaceByIndex(start, elements, deleteCount = 1) {
    if (start < 0) start = this.length + start;
    if (!Array.isArray(elements)) elements = Array(deleteCount).fill(elements);

    this.splice(start, deleteCount, ...elements);

    return this;
  }

  get(index = 0) {
    return getFromPath(this, index);
  }

  getEach(path = '0') {
    return this.map((item) => {
      return getFromPath(item, path);
    });
  }

  lastIndex() {
    return this.length - 1;
  }

  copy() {
    return Collection.from(this);
  }

  remove(value, deleteCount = 1) {
    const removeAll = deleteCount < 0;
    while (deleteCount-- > 0 || removeAll) {
      const index = this.deepIndexOf(value);

      if (index === -1) return this;

      this.splice(index, 1);
    }

    return this;
  }

  first() {
    return this[0];
  }

  last() {
    return this[this.lastIndex()];
  }

  static create(...params) {
    return new Collection(...params);
  }

  isEmpty(deep = false) {
    return deep ? isEqual(this, []) : this.length === 0;
  }

  compact(excludeZero = false) {
    return this.filter((item) =>
      item === 0 && excludeZero ? true : Boolean(item)
    );
  }

  concat(...values) {
    values.forEach((value) => {
      Array.isArray(value) ? this.push(...value) : this.push(value);
    });
    return this;
  }

  difference(arr) {
    return this.filter(item => {
      return arr.every(el => !isEqual(el, item));
    });
  }

  differenceBy(arr, property) {
    return this.filter((item) => {
      return arr.every((el) => !isEqual(this.iteratee(property, item), this.iteratee(property, el)));
    });
  }

  differenceWith(arr, comparator) {
    return this.filter(item => {
      return arr.every(el => !comparator(item, el));
    });
  }

  #drop(direction, dropCount) {
    if (dropCount >= this.length) {
      return Collection.create();
    }

    const start = direction === DIRECTION.LEFT ? dropCount : 0;
    const end = direction === DIRECTION.LEFT ? undefined : this.length - dropCount;
    return this.slice(start, end);
  }

  drop(dropCount = 1) {
    return this.#drop(DIRECTION.LEFT, dropCount)
  }

  dropRight(dropCount = 1) {
    return this.#drop(DIRECTION.RIGHT, dropCount)
  }

  #dropWhile(direction, iteratee) {
    const newArr = Collection.create();
    let currentIndex = direction === DIRECTION.LEFT ? 0 : this.length - 1;
    const getRealPosition = (currentIndex) => direction === DIRECTION.RIGHT ? this.length - currentIndex : currentIndex;
    const condition = direction === DIRECTION.LEFT ? (index) => index < this.length : (index) =>  index >= 0
    const add = direction === DIRECTION.LEFT ? this.push.bind(newArr) : this.unshift.bind(newArr);

    for (; condition(currentIndex); currentIndex += direction) {
      const result = this.iteratee(iteratee, this[currentIndex], currentIndex, this);
      if (result) continue;

      add(this[currentIndex]);
    }

    return newArr;
  }

  dropWhile(iteratee) {
    return this.#dropWhile(DIRECTION.LEFT, iteratee);
  }

  dropWhileRight(iteratee) {
    return this.#dropWhile(DIRECTION.RIGHT, iteratee);
  }

  deepIncludes(value) {
    return this.some((item) => isEqual(value, item));
  }

  includesBy(iteratee, value) {
    return this.some((item) => isEqual(this.iteratee(iteratee, item), value));
  }

  getDuplicate(deep = false, uniq) {
    const includes = deep ? this.deepIncludes : this.includes;

    return (prev, curr) => {
      if (uniq && includes.call(prev, curr)) return prev;

      if (this.isDuplicate(curr, deep)) {
        prev.push(curr);
      }

      return prev;
    };
  }

  getOnlyUniqValue(deep) {
    return (prev, curr) => {
      if (!this.isDuplicate(curr, deep)) {
        prev.push(curr);
      }

      return prev;
    };
  }

  isDuplicate(value, deep = false) {
    const indexOf = deep ? this.deepIndexOf : this.indexOf;
    const lastIndexOf = deep ? this.deepLastIndexOf : this.lastIndexOf;

    const index = indexOf.call(this, value);
    const lastIndex = lastIndexOf.call(this, value);

    return index !== lastIndex;
  }

  withoutDuplicates(deep = false) {
    return this.reduce(this.getOnlyUniqValue(deep), Collection.create());
  }

  duplicates(uniq = true) {
    return this.reduce(this.getDuplicate(false, uniq), Collection.create());
  }

  deepDuplicates(uniq = true) {
    return this.reduce(this.getDuplicate(true, uniq), Collection.create());
  }

  deepIndexOf(value, fromIndex = 0) {
    if (fromIndex < 0) {
      fromIndex = 0;
    }
    fromIndex = fromIndex - 1;

    while (++fromIndex < this.length) {
      if (isEqual(this[fromIndex], value)) {
        return fromIndex;
      }
    }

    return -1;
  }

  deepLastIndexOf(value, fromIndex = 1) {
    if (Number.isNaN(fromIndex) || fromIndex >= this.length) {
      fromIndex = 1;
    }

    fromIndex = this.length - Math.abs(fromIndex);
    while (fromIndex-- > -1) {
      if (isEqual(this[fromIndex], value)) {
        return fromIndex;
      }
    }

    return -1;
  }

  clear() {
    return this.splice(0);
  }

  isEqualTo(collection) {
    return isEqual(this, collection);
  }

  fromEntries() {
    return this.reduce((prev, [key, value]) => {
      return { ...prev, [key]: value };
    }, {});
  }

  eachAsEntries() {
    return this.map((item) => Collection.from(Object.entries(item))).flat(1);
  }

  uniq() {
    return this.reduce((prev, curr) => {
      if (!prev.deepIncludes(curr)) prev.push(curr);
      return prev;
    }, Collection.create());
  }

  uniqBy(prop) {
    return this.reduce((prev, curr) => {
      if (!objectIncludes(prev, curr[prop], prop)) prev.push(curr);
      return prev;
    }, []);
  }

  count(iteratee) {
    return this.reduce((prev, curr) => (this.iteratee(iteratee, curr) ? ++prev : prev), 0);
  }

  countBy(iteratee) {
    return this.reduce((prev, curr) => {
      const key = this.iteratee(iteratee, curr);

      if (typeof prev[key] === 'number') {
        prev[key] += 1;
      } else {
        prev[key] = 1;
      }

      return prev;
    }, {});
  }

  invokeMap(fn, ...args) {
    return this.map((item) => {
      if (typeof fn === 'string') {
        return item[fn](...args);
      }

      return fn.call(item, ...args);
    });
  }

  keyBy(iteratee) {
    return this.reduce((prev, curr) => {
      const key = this.iteratee(iteratee, curr);
      return { ...prev, [key]: curr };
    }, {});
  }

  groupBy(iteratee) {
    return this.reduce((prev, curr) => {
      const key = this.iteratee(iteratee, curr);
      if (prev[key]) prev[key].push(curr);
      else prev[key] = [curr];

      return prev;
    }, {});
  }

  sortBy(props, orders = 'asc') {
    props = !Array.isArray(props) ? [props] : props;
    return this.sort((a, b) => {
      return props
        .map((prop, index) => {
          const order = !Array.isArray(orders)
            ? orders
            : orders[index] || orders[orders.length - 1];
          const firstValue = this.iteratee(prop, a);
          const secondValue = this.iteratee(prop, b);
          const isEachString = isString(firstValue) && isString(secondValue);

          if (isEachString) {
            if (order === 'asc') {
              return firstValue.localeCompare(secondValue);
            }

            return secondValue.localeCompare(firstValue);
          }

          return order === 'asc'
            ? firstValue - secondValue
            : secondValue - firstValue;
        })
        .reduce((prev, curr) => prev || curr, 0);
    });
  }

  iteratee(param, value, ...args) {
    if (Array.isArray(param)) {
      param = { [param[0]]: param[1] };
    }

    switch (typeof param) {
      case "function": {
        return param(value, ...args);
      }
      case "string": {
        const result = getFromPath(value, param);

        if (typeof result === 'undefined') {
          return hasOwnProperty(value, param);
        }

        return result;
      }
      case "object": {
        return isEqual(Collection.partial(param), value);
      }
    }
  }

  partition(match) {
    return this.reduce(
      (prev, curr) => {
        if (this.iteratee(match, curr)) prev[0].push(curr);
        else prev[1].push(curr);

        return prev;
      },
      Collection.from([[], []])
    );
  }

  reject(iteratee) {
    return this.filter((item) => !this.iteratee(iteratee, item));
  }

  sample(size = 1, uniq = true) {
    const randElements = [];
    let mutableSize = size;

    if (size > this.length) mutableSize = this.length;

    while (mutableSize-- > 0) {
      const randIndex = random(0, this.length - 1, true);

      if (uniq && randElements.includes(this[randIndex])) {
        mutableSize++;
        continue;
      }

      randElements.push(this[randIndex]);
    }

    return size === 1 ? randElements[0] : Collection.from(randElements);
  }

  shuffle() {
    const arr = this.copy();

    return this.map(() => arr.splice(random(0, arr.length), 1)[0]);
  }

  initial() {
    return this.slice(0, this.length - 1);
  }

  tail() {
    return this.slice(1, this.length);
  }

  intersection() {
    return this[0].filter((el) => this.every((i) => i.deepIncludes(el))).uniq()
  }

  intersectionBy(prop) {
    return this[0]
      .filter((a) => {
        return this.every((b) => {
          return b.includesBy(prop, getFromPath(a, prop));
        });
      })
      .uniq();
  }

  _zip(result, callback, map) {
    let index = 0;
    while (index < this[0].length) {
      callback(result, index, map);
      index++;
    }

    return result;
  }

  zip() {
    const result = this._zip([], (result, index) => {
      let elements = this.map((item) => item[index]);

      result.push(elements);
    });

    return Collection.from(result);
  }

  zipWith(iteratee) {
    const result = this._zip([], (result, index, iteratee) => {
      let elements = this.map((item) => item[index]);

      result.push(iteratee(...elements));
    }, iteratee);

    return Collection.from(result);
  }

  unzip() {
    return this.zip();
  }

  without(...values) {
    values = Collection.from(values);
    return this.filter((item) => !values.deepIncludes(item));
  }

  zipObject() {
    return this._zip({}, (result, index) => {
      result[this[0][index]] = this[1][index];
    });
  }

  zipObjectDeep() {
    return this._zip({}, (result, index) => {
      put(this[0][index], this[1][index], result)
    });
  }

  toString() {
    return this.json();
  }

  json() {
    return JSON.stringify(this);
  }

  static partial(value) {
    return Partial.create(value);
  }

  static #fromObject(object) {
    object = { ...object };
    Object.entries(object).forEach(([key, value]) => {
      if (isObject(value)) {
        object[key] = this.from(value);
      }
    });

    return object;
  }

  static from(arr) {
    if (Array.isArray(arr)) {
      return arr.reduce((prev, curr) => {
        if (isObject(curr)) {
          prev.push(this.from(curr));
        } else {
          prev.push(curr);
        }

        return prev;
      }, this.create());
    }

    if (isObject(arr)) {
      return this.#fromObject(arr);
    }
  }
}

function EasyArray(arrayLike, deep = true) {
  let array = arrayLike;
  if (!Array.isArray(arrayLike)) {
    array = Array.from(arrayLike, arrayLike.map);
  }

  return deep ? Collection.from(array) : new Collection(...array);
}

export { EasyArray, Collection };
