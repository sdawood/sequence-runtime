const F = require('functional-pipelines');
const jp = require('jsonpath');

const {nodes, scan, iterate} = require('./iterator');

describe('iterator', () => {
  const template = {
    A: {
      B: {
        D: {
          H: 'H'
        },
        E: {
          I: 'I',
          J: 'J'
        }
      },
      C: {
        F: {K: 'K'},
        G: 'G'
      }
    }
  };

  it('should return an iterator of JSON Tree Nodes', () => {
    const xfExtractPath = F.mapTransformer(({path}) => path);
    const xfStringify = F.mapTransformer(pathArray => jp.stringify(pathArray));
    const transducerFn = F.compose(xfExtractPath, xfStringify);
    const reducingFn = transducerFn(F.append(/*reducingFn*/)); // append is a transducer fn that ignores its argument and returns a reducing function that appends to an array
    const paths = F.reduce(reducingFn, () => [], nodes(template));
    expect(paths).toEqual(jp.paths(template, '$..*').map(pathArray => jp.stringify(pathArray)));
  });
});

describe('scenario: scan vs reduce', () => {

  it('does include the returned value if reduced with F.reduce which uses for-of internally', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      return 4;
    }

    // reduce passes the enumerator through F.iterator, which creates an iterator that would include the generator-return-value before using for-of internally
    const result = F.reduce((acc, record) => {
      acc.state.push(record + (acc.state[acc.index - 1] || 0));
      acc.index += 1;
      return acc;
    }, () => ({state: [], index: 0}), withReturn(), ({state}) => state);

    const expectedResults = [1, 3, 6, 10]; // return value is consumed by the F.reduce looping

    expect(result).toEqual(expectedResults);
  });

  it('does include the returned value if the (idempotent) F.iterator used', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      return 4;
    }

    // F.iterator is idempotent
    const result = F.reduce((acc, record) => {
      acc.state.push(record + (acc.state[acc.index - 1] || 0));
      acc.index += 1;
      return acc;
    }, () => ({state: [], index: 0}), F.iterator(withReturn()), ({state}) => state);

    const expectedResults = [1, 3, 6, 10]; // return value is indeed consumed!!! the for-off problem gone :).

    expect(result).toEqual(expectedResults);
  });

  it('does include the returned value if the (idempotent) iter-tools iterator used wrapped in F.iterator', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      return 4;
    }

    // F.iterator is idempotent
    const result = F.reduce((acc, record) => {
      acc.state.push(record + (acc.state[acc.index - 1] || 0));
      acc.index += 1;
      return acc;
    }, () => ({state: [], index: 0}), iterate(F.iterator(iterate(withReturn()))), ({state}) => state);

    const expectedResults = [1, 3, 6, 10]; // return value is indeed consumed!!! the for-off problem gone :).

    expect(result).toEqual(expectedResults);
  });


  it('works: scan has built in handling for the inner generator return value', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      return 4;
    }
    const resultSeq = scan((acc, input) => {
      return {...acc, state: acc.state + input};
    }, () => ({state: 0}), withReturn(), ({state}) => state);
    const expectedResults = [{state: 1}, {state: 3}, {state: 6}, {state: 10}, 10];

    expect([...resultSeq]).toEqual(expectedResults);
  });

  it('works: scan has a behavior by design to yield `return` value, then run resultFn and yield that result last', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }
    const resultSeq = scan((acc, input) => {
      return {...acc, state: acc.state + input};
    }, () => ({state: 0}), withReturn(), ({state}) => state);
    const expectedResults = [{state: 1}, {state: 3}, {state: 6}, {state: 10}, 10];

    expect([...resultSeq]).toEqual(expectedResults);
  });

  it('works: scan has handling for `reduced` value as `final yield` or `return-result`, then run resultFn and yield that result last', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }
    const resultSeq = scan((acc, input) => {
      if(input === 3) {
        return F.reduced({...acc, state: acc.state + input});
      }
      return {...acc, state: acc.state + input};
    }, () => ({state: 0}), withReturn(), ({state}) => state);
    const expectedResults = [
      {
        "state": 1
      },
      {
        "state": 3
      },
      {
        "state": 6 // reduced(acc) is yielded in unreduced shape, consistent with the last yield with no-return & the return behavior
      },
      6
    ];

    expect([...resultSeq]).toEqual(expectedResults);
  });

  it('works: mutation is bad for lazy sequence, specially with scan semantics (just like Redux ones)', () => {
    function* withReturn() {
      yield 1;
      yield 2;
      yield 3;
      return 4;
    }
    const resultSeq = scan((acc, input) => {
      acc.state = acc.state + input;
      return acc;
    }, () => ({state: 0}), withReturn(), ({state}) => state);
    const expectedResults = [{state: 10}, {state: 10}, {state: 10}, {state: 10}, 10];

    expect([...resultSeq]).toEqual(expectedResults);
  });
});

describe('scenario: yield* and ...spread handling of inner generator return value', () => {
  it('works: does NOT include the return value', () => {
    function* inner() {
      yield 1;
      yield 2;
      return 3;
    }

    function* outer() {
      yield '-start-';
      yield* inner();
      yield '-middle-';
      yield* inner();
      return '-end-'
    }
    const result = [...outer()];

    const expectedResult = [
      "-start-",
      1,
      2, // no return from inner by yield*, once
      "-middle-",
      1,
      2 // no return from inner by yield*, twice
      // no return from outer by ...spread
    ];

    expect(result).toEqual(expectedResult);
  });
  it('works: does include the return value once we shim it with F.iterator', () => {
    function* inner() {
      yield 1;
      yield 2;
      return 3;
    }

    function* outer() {
      yield '-start-';
      yield* F.iterator(inner());
      yield '-middle-';
      yield* F.iterator(inner());
      return '-end-'
    }
    const result = [...F.iterator(outer())];

    const expectedResult = [
      '-start-',
      1,
      2,
      3,
      '-middle-',
      1,
      2,
      3,
      '-end-'
    ];
    expect(result).toEqual(expectedResult);
  });
});

describe('scenario: iterator VS generator destructuring behavior', () => {
  it('works: iterators resume yielding after repetitive destructuring', () => {
    const iterable = [1, 2, 3, 4];
    const iterator = iterable[Symbol.iterator]();
    const [one, two] = iterator;
    const [three, four, five, six] = iterator;
    const result = [one, two, three, four, five, six];
    const expectedResult = [1, 2, 3, 4, undefined, undefined];
    expect(result).toEqual(expectedResult);
  });

  it('does not work: generators do not resume yielding after repetitive destructuring', () => {
    const generator = function* () {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }();

    const [one, two] = generator;
    const [three, four, five, six] = generator;
    const result = [one, two, three, four, five, six];
    const expectedResult = [1, 2, undefined, undefined, undefined, undefined];
    expect(result).toEqual(expectedResult);
  });

  it('fixed: generators (decorated with iterator() helper) resume yielding after repetitive destructuring', () => {
    const generator = F.iterator(function* () {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }());

    const [one, two] = generator;
    const [three, four, five, six] = generator;
    const result = [one, two, three, four, five, six];
    const expectedResult = [1, 2, 3, 4, undefined, undefined];
    expect(result).toEqual(expectedResult);
  });
});
