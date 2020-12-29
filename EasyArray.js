import { isEqual, objectIncludes, isString, random, getFromPath, put } from './helpers';

class Collection extends Array {
  constructor(...array) {
    super(...array);
  }

  chunk(size) {
    const chunks = Collection.__create();
    for (let i = 0; i < this.length; i+=size) {
      chunks.push(this.slice(i, size + i));
    }

    return chunks;
  };

  split(splitter) {
    return this.map(item => Collection.from(item.split(splitter)));
  }

  replace(searchValue, replaceValue, replaceAll = false) {
    let i = 0;

    for (const item of this) {
      if (isEqual(item, searchValue)) {
        this[i] = replaceValue;
        if (!replaceAll) break;
      }

      i++;
    }

    return this;
  }

  replaceByIndex(start, elements, deleteCount = 1) {
    if (start = 'last') start = this.length - 1;
    if (!Array.isArray(elements)) elements = Array(deleteCount).fill(elements);
    this.splice(start, deleteCount, ...elements);

    return this;
  }

  get(index = 0) {
    return getFromPath(this, index);
  }

  getEach(index = 0) {
    return this.map(item => {
      return getFromPath(item, index);
    });
  }

  lastIndex() {
    return this.length - 1;
  }

  copy() {
    return Collection.from(this);
  }

  remove(index, deleteCount = 1) {
    return this.splice(index, deleteCount);
  }

  first() {
    return this[0];
  }

  last() {
    return this[this.lastIndex()];
  }

  static __create(...params) {
    return new Collection(...params);
  }

  isEmpty(each = false) {
    if (each) return this.compact(true).isEmpty();
    else return this.length === 0;
  }

  compact(excludeZero = false) {
    return this.filter(item => item === 0 && excludeZero ? true : Boolean(item));
  }

  _concat(...values) {
    values.forEach(value => {
      Array.isArray(value) ? this.push(...value) : this.push(value)
    });
    return this;
  }

  difference(arr) {
    return this.filter(item => {
      return arr.every(el => !isEqual(item[property], el[property]));
    });
  }

  differenceBy(arr, property) {
    return this.filter(item => {
      return arr.every(el => item[property] !== el[property]);
    })
  }

  dropWhile(iteratee) {
    const newArr = Collection.__create();
    for (let i = 0; i < this.length; i++) {
      const result = this.__iteratee(iteratee, this[i], i, this);

      if (!result) return newArr;

      newArr.push(this[i]);
    }

    return newArr;
  }

  _includes(value) {
    return this.some(item => isEqual(value, item));
  }

  _includesBy(param, value) {
    return this.some(item => isEqual(item[param], value));
  }

  __reduceDuplicates(prefix = '') {
    const includes = prefix + 'includes';
    const indexOf = prefix + 'indexOf';
    const lastIndexOf = prefix + 'lastIndexOf';
    return (prev, curr) => {
      console.log(this[indexOf](curr), this[lastIndexOf](curr))
      if (!prev[includes](curr)) {
        if (this[indexOf](curr) !== this[lastIndexOf](curr)) {
          prev.push(curr);
        }
      }

      return prev;
    }
  }

  duplicates() {
    const reducer = this.__reduceDuplicates();
    return this.reduce(reducer, Collection.__create());
  }

  deepDuplicates() {
    return this.reduce(this.__reduceDuplicates('_'), Collection.__create());
  }

  _indexOf(value, fromIndex = 0) {
    const slice = this.slice(fromIndex);

    return slice.findIndex(item => isEqual(item, value)) + fromIndex;
  }

  _lastIndexOf(value, fromIndex = this.length - 1) {
    while (fromIndex > -1) {
      if (isEqual(this[fromIndex], value)) {
        return fromIndex;
      }

      fromIndex--;
    }

    return -1;
  }

  empty() {
    return this.splice(0);
  }

  isEqualTo(collection) {
    return isEqual(this, collection);
  }

  fromEntries() {
    this.reduce((prev, [key, value]) => {
      return {...prev, [key]: value};
    }, {});
  }

  eachAsEntries() {
    return this.map(item => Object.entries(item));
  }

  uniq() {
    return this.reduce((prev, curr) => {
      if (!prev._includes(curr)) prev.push(curr);
      return prev;
    }, Collection.__create());
  }

  uniqBy(prop) {
    return this.reduce((prev, curr) => {
      if (!objectIncludes(prev, curr[prop], prop)) prev.push(curr);
      return prev;
    }, []);
  }

  count(value) {
    return this.reduce((prev, curr) => isEqual(value, curr) ? ++prev : prev, 0);
  }

  countBy(value, prop) {
    return this.reduce((prev, curr) => isEqual(value, curr[prop]) ? ++prev : prev, 0);
  }

  countAll(key = undefined) {
    const result = this.reduce((prev, curr) => {
      const exists = [...prev.keys()].find(item => isEqual(curr, item));
      let currCount = prev.get(exists);

      if (exists) prev.set(exists, ++currCount);
      else prev.set(curr, 1);

      return prev;
    }, new Map());

    if (key) return this.getFromMap(result, key);

    return result;
  }

  invokeMap(fn, ...args) {
    return this.map(item => {
      if (typeof fn === 'string') {
        return item[fn](...args);
      }

      return fn.call(item, ...args)
    })
  }

  keyBy(iteratee) {
    return this.reduce((prev, curr) => {
      const key = this.__iteratee(iteratee, curr);
      return {...prev, [key]: curr}
    }, {})
  }

  groupBy(iteratee) {
    return this.reduce((prev, curr) => {
      const key = this.__iteratee(iteratee, curr);
      if (prev[key]) prev[key].push(curr);
      else prev[JSON.stringify(key)] = [curr];

      return prev;
    }, {});
  }

  sortBy(props, orders = 'asc') {
    props = !Array.isArray(props) ? [props] : props;
    return this.sort((a, b) => {
      return props.map((prop, index) => {
        const order = !Array.isArray(orders) ? orders : (
          orders[index] || orders[orders.length - 1]
        );
        const firstValue = a[prop];
        const secondValue = b[prop];
        const areString = isString(firstValue) && isString(secondValue);

        if (areString) {
          if (order === 'asc') {
            return firstValue.localeCompare(secondValue);
          }

          return secondValue.localeCompare(firstValue);
        }

        return order === 'asc' ? firstValue - secondValue : secondValue - firstValue;
      })
      .reduce((prev, curr) => prev || curr, 0)
    });
  }

  __iteratee(param, value, ...args) {
    if (Array.isArray(param)) {
      param = {[param[0]]: param[1]};
    }

    const types = {
      'function': () => param(value, ...args),
      'string': () => getFromPath(value, param),
      'object': () => Object.entries(param).every(([key, paramValue]) => isEqual(value[key], paramValue)),
    }

    const type = typeof param;
    return types[type]();
  }

  partition(match) {
    return this.reduce((prev, curr) => {
      if (this.__iteratee(match, curr)) prev[0].push(curr);
      else prev[1].push(curr);

      return prev;
    }, [[], []])
  }

  fillKeys(fill, prop = undefined) {
    return this.reduce((prev, curr) => {
      const value = this.__iteratee(fill, curr);
      const key = this.__iteratee(prop, curr);

      prev[key] = value;
      return prev;
    }, {})
  }

  reject(iteratee) {
    return this.filter(item => !this.__iteratee(iteratee, item))
  }

  sample(size = 1) {
    const randElements = [];
    while (size-- > 0) {
      const randIndex = random(0, this.length - 1);

      randElements.push(this[randIndex]);
    }

    return size === 1 ? randElements[0] : randElements;
  }

  shuffle() {
    const arr = this.copy();

    return this.map(
      () => arr.splice(random(0, arr.length), 1)[0]
    )
  }

  initial() {
    return this.slice(0, this.length - 1);
  }

  tail() {
    return this.slice(1, this.length);
  }

  intersection() {
    return this[0].filter(el => this.every(i => i._includes(el))).flat(1).uniq();
  }

  intersectionBy(param) {
    return this[0].filter((a) => {
      return this.every(b => {
        return b._includesBy(param, a[param]);
      });
    })
    .flat(1)
    .uniq();
  }

  zip(iteratee = (...value) => value, passAsArray = false) {
    let index = 0;
    const result = Collection.__create();
    while(index < this[0].length) {
      let elements = this.map(item => item[index]);
      if (passAsArray) elements = iteratee(elements);
      else elements = iteratee(...elements);

      result.push(elements)
      index++;
    }

    return result;
  }

  unzip() {
    return this.zip();
  }

  without(...values) {
    return this.filter(item => !Collection.from(values)._includes(item));
  }

  zipObject() {
    let index = 0;
    const result = {};
    while(index < this[0].length) {
      result[this[0][index]] = this[1][index];
      index++;
    }

    return result;
  }

  zipObjectDeep() {
    const obj = {};
    this[0].forEach((path, index) => {
      put(path, this[1][index], obj);
    });

    return obj;
  }

  toString() {
    return this.json();
  }

  json() {
    return JSON.stringify(this);
  }

  static from(arr) {
    return arr.reduce((prev, curr) => {
      if (Array.isArray(curr)) {
        prev.push(this.from(curr));
      } else prev.push(curr);

      return prev;
    }, this.__create())
  }
}
function EasyArray(array) {
  return Collection.from(array);
}

export { EasyArray, Collection };