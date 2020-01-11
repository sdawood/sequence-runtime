const F = require('functional-pipelines');

const nodes = (json, {parent, FQP, queue} = {}) => F.toIterator(
  function* nodes(json, {parent = '$', FQP = [parent], queue = []}) {
    let rootIterator = F.entries(json);
    const formatKey = F.isArray(json) ? k => parseInt(k, 10) : k => k;
    for (const [key, value] of rootIterator) {
      const path = [...FQP, formatKey(key)];
      yield {path, value}; // @TODO we might need a parent reference returned in ctx: {$$parent}, for back-tracking at least
      if (F.isContainer(value)) {
        queue.push([value, {parent: key, FQP: path}]); //recursive args
      }
    }
    for (const args of queue) {
      yield* nodes(...args);
    }

  }(json, {parent, FQP, queue}));

const range = ({start = 0, end = Number.POSITIVE_INFINITY, step = 1} = {}) => F.toIterator(
  function* range({start, end, step}) {
  let index = start || 0;
  while(index < end) {
    yield index;
    index += step;
  }
}({start, end, step}));

function* scan(reducingFn, initFn, enumerable, resultFn) {
  if (F.isFunction(resultFn)) {
    resultFn = F.pipe(F.unreduced, resultFn);
  } else {
    resultFn = F.unreduced;
  }
  let result;
  const iter = F.iterator(enumerable);

  if (!initFn) {
    const [initValue] = iter;
    initFn = F.lazy(initValue);
  }
  result = initFn();

  // if we use for-of we miss the final value `return`ed from the inner sequence
  // return is the only mechanism to signal the value as the last value, normally your consumer is surprised that done === true with value === undefined
  // for-of ignores it, since done is returned true with the final value

  let {value, done} = iter.next();
  while(!done || value !== undefined) { // to include returned value from inner sequence if any
    result = reducingFn(result, value);
    if (F.isReduced(result)) {
      yield F.unreduced(result);
      break;
    }
    yield result;
    ({value, done} = iter.next());
  }

  yield resultFn(result);
  // yield inner sequence `return` value, to be present for ... spread operator and for-of looping that ignores {value: final, done: true}
  return; // {value: undefined, done: true} // scan would prevent itself from needing to be wrapped into F.iterator to get the return value, still should be wrapped for destructuring compatibility
}

const iterate = iter => F.iterator(function* iterate(iter) {
  let {value, done} = iter.next();
  while(!done || value !== undefined) { // to include returned value from inner sequence if any
    yield value;
    ({value, done} = iter.next());
  }
}(iter));

module.exports = {
  nodes,
  range,
  scan,
  iterate,
};
