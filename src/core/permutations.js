const F = require('functional-pipelines');
const {pipe} = require('./pipe');

function permuteRecur(a, chosen = []) {
  // console.log(`permuteRest(${JSON.stringify({a, chosen})})`);
  if (a.length === 0) {
    // console.log(JSON.stringify({chosen}));
    return chosen;
  } else {
    for (let i = 0; i < a.length; i++) {
      //choose
      const c = a[i];
      chosen.push(c);
      a.splice(i, 1);
      //explore
      permuteRecur(a, chosen);
      //unchoose
      a.splice(i, 0, c);
      chosen.pop();
    }
  }
}

function* permute(a, chosen = []) {
  // console.log(`permute(${JSON.stringify({a, chosen})})`);
  if (a.length === 0) {
    // console.log(JSON.stringify({chosen}));
    yield [...chosen]; // if we don't shallow copy chosen array, the reference would get empty before we yield the next time.
  } else {
    for (let i = 0; i < a.length; i++) {
      //choose
      const c = a[i];
      chosen.push(c);
      a.splice(i, 1);
      //explore
      yield* permute(a, chosen);
      //un-choose
      a.splice(i, 0, c);
      chosen.pop();
    }
  }
}

function* __permuteEnumerables(enumerables, {chosen = [], recur = false} = {}) {
  if (!recur) {
    enumerables = enumerables.map((sourceFn, index) => ({sourceFn, source: F.toIterator(sourceFn()), name: index}))
  }
  // console.log(`permute(${JSON.stringify({a, chosen})})`);
  // console.log(`permute(enumerables.length=${enumerables.length}, chosen.length=${chosen.length})`);
  if (enumerables.length === 0) {
    const result = F.map(({value, name}) => ({value, name}), chosen); // if we don't shallow copy chosen array, the reference would get empty before we yield the next time.
    console.log(result);
    yield result;
  } else {
    for (let i = 0; i < enumerables.length; i++) {
      //choose
      const {source, sourceFn, name, done: isDone} = enumerables[i];
      console.log({iteration: i, recur, name, isDone, isIterator: F.isIterator(source)});
      enumerables.splice(i, 1); // we should splice here, in case we continue, we assume the current complete iterator is gone

      let value, done;
      let openSource = source;
      ({value, done} = openSource.next());

      if (done) {
        console.log(`restarting generator #${name} ...`);
        openSource = sourceFn();
        ({value, done} = openSource.next());
      }
      console.log({iteration: i, recur, name, value, done});
      chosen.push({value, done, source: openSource, sourceFn, name});
      // we used to a.splice(i, 1) here

      //explore
      yield* permuteEnumerables(enumerables, {chosen, recur: true});
      //un-choose

      enumerables.splice(i, 0, {value, done, source: openSource, sourceFn, name});

      chosen.pop();
    }
  }
}

function* __spinner(enumerables, {chosen = [], recur = false} = {}) {

  // const reduce = (reducingFn, initFn, resultFn) => enumerable => F.reduce(reducingFn, initFn, enumerable, resultFn);

  // serious initialization business, sell for pieces of reuse
  const {sourcesByName, state: {names, permutations}} = F.reduce(
    (acc, entry) => {
      const {value, done, restarts = 0, source, name} = entry;
      console.log({value, done, restarts, source, name});
      acc.state.names.push(name);
      acc.state.permutations.push({value, name});
      acc.sourcesByName[name] = {value, done, restarts, source, name};
      return acc;
    },
    () => ({sourcesByName: {}, state: {permutations: [], names: []}}),
    pipe(
      gen => F.iterator(gen(), {indexed: true, kv: true}),
      pipe(([name, source]) => { // concatMap use case but with iterators
        const {value, done} = source.next();
        console.log({value, done, name});
        if (done) {
          throw new Error('Illegal Arguments: cannot use empty enumerable inside the args list');
        }
        return {value, done, source, name};
      })
    )(enumerables),
  );

  yield permutations; // just a mock, we MUST yield each new set
}

const values = records => records.map(({value}) => value);

const allInState = state => records => records.reduce((acc, {status}) => {
  return acc && (state === status);
}, true);

const getOneFrom = nextSources => record => {
  let {value, done} = record.source.next();
  if (done) {
    record.status = 'restart';
    if (record.name < (nextSources.length - 1)) { // every one but the last
      record.source = record.sourceFn();

      nextSources[record.name + 1].status = 1;
      // console.log({next: nextSources[record.name + 1]})
      ({value, done} = record.source.next());
    } else {
      // console.log('******* restarting last source !!! ******* ');
      // console.log('******* End of the line ... Folks ;) ******* ');
      nextSources.map(record => record.status = 'end');
      console.log(nextSources);
    }

  }
  return {value, done}
};

function* generatorCombinator(sourceFns, {chosen = [], recur = false, permuteChoices = false} = {}) {
  let all = true;
  const sources = sourceFns.map((sourceFn, name) => {
    const source = sourceFn();
    const {value, done} = source.next();
    console.log({value, done, name});
    if (done) {
      throw new Error(`Illegal Arguments: cannot use empty enumerable at index [${name}]`);
    }
    return {value, done, name, source, sourceFn, status: name === 0 ? 'on' : 'off'};
  });

  let nextSources = [...sources]; // shallow copy, why?
  do {

    if(permuteChoices) {
      yield* permute(values(sources));
    } else {
      yield values(nextSources);
    }

    nextSources = nextSources.reduce((acc, record) => {
      console.log({value: record.value, name: record.name, status: record.status});
      let value, done;
      switch (record.status) {
        case 'on': {
          ({value, done} = getOneFrom(nextSources)(record));
          break;
        }
        case 'restart': {
          record.status = 'on';
          ({value, done} = getOneFrom(nextSources)(record));
          break;
        }
        default: {
          if (F.isNumber(record.status)) {
            console.log({oneOff: record});
            record.status -= 1;
            ({value, done} = getOneFrom(nextSources)(record));
            // record.status = record.status ? 'off' : record.status;
            switch (record.status) {
              case 0:
              case 'restart': {
                record.status = 'off';
                break;
              }
              case 'end':{
                record.done = true;
                break;
              }
            }
          }
          break;
        }
      }

      record.value = value === undefined ? record.value : value; // off sources hold their value
      record.done = done === undefined ? record.done : done;

      acc.push(record);
      return acc;
    }, []);


  } while (!allInState('end')(nextSources));
}

const generatorCombinatorPermutator = (sourceFns, options) => {
  return generatorCombinator(sourceFns, {...options, permuteChoices: true})
};

/////////////////////// Vector Product Python Example [WIP] //////////////////////////////

// itertools.product([1, 2], ['a', 'b']) == Vector Product
// def product(*args, repeat=1):
//   # product('ABCD', 'xy') --> Ax Ay Bx By Cx Cy Dx Dy
//   # product(range(2), repeat=3) --> 000 001 010 011 100 101 110 111
//   pools = [tuple(pool) for pool in args] * repeat
//   result = [[]]
//   for pool in pools:
//     result = [x+[y] for x in result for y in pool]
//   for prod in result:
//     yield tuple(prod)


function* product(...args) {
  const pools = [];
  for (const pool of args) {
    pools.push([pool]);
  }
  let result = [[]];
  for (const pool of pools) {
    for (const y of pool) {
      for (const x of result) {
        result.push(x.concat(y));
      }
    }
  }
  for (const prod of result) {
    yield prod;
  }
}

/////////////////////// Vector Product Python Example [WIP] //////////////////////////////


// console.log([...permute(['A', 'B', 'C', 'D', 'E'])]);

module.exports = {
  permute,
  generatorCombinator,
  generatorCombinatorPermutator
};
