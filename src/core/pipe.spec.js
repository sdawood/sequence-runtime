const F = require('functional-pipelines');

const {pipe, pipeWith} = require('./pipe');
const {range, scan} = require('./iter-tools/iterator');

describe('scenario: pipe receiving a nested pipe', () => {
  it('works: pipe can have mapping and filtering functions, utilizing reduced(x)', () => {
    const result = [...pipe(
      n => n * 2, // mapping function
      n => n > 4 ? F.reduced(n) : n, // filtering function
      n => range({start: 1, end: n + 1}),
      pipe(
        n => n * 10 // range then pipe resembles concatMap(n => range(n)), n => n * 10)
      ),
      transformedGen => [...transformedGen], // toArray() operator
      result => ({result}),
    )(range({start: 1, end: 5}))];
    const expectedResult = [
      {
        "result": [
          10,
          20
        ]
      },
      {
        "result": [
          10,
          20,
          30,
          40
        ]
      },
      6, // 3 * 2 > 4 -> F.reduced(6) -> zipping over the rest of the steps
      8 // 4 * 2 > 4 -> F.reduced(8) -> zipping over the rest of the steps
    ];
    expect(result).toEqual(expectedResult);
  });
  it('works: as you would expect from inner iterables', () => {
    const result = [...pipe(
      n => n * 2,
      n => range({start: 1, end: n + 1}),
      pipe(
        n => n * 10
      ),
      transformedGen => [...transformedGen],
      result => ({result}),
    )(range({start: 1, end: 5}))];
    const expectedResult = [
      {
        "result": [
          10,
          20
        ]
      },
      {
        "result": [
          10,
          20,
          30,
          40
        ]
      },
      {
        "result": [
          10,
          20,
          30,
          40,
          50,
          60
        ]
      },
      {
        "result": [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80
        ]
      }
    ];
    expect(result).toEqual(expectedResult);
  });
  it('works: scan does what you expect from concating operators', () => {
    const result = [...pipe(
      n => n * 2,
      n => range({start: 1, end: n + 1}),
      pipe(
        n => n * 10
      ),
      iter => scan((acc, input) => {
        return {...acc, state: acc.state + input};
      }, () => ({state: 0}), iter, ({state}) => state),
      transformedGen => [...transformedGen],
      // result => result.slice(-1),
    )(range({start: 1, end: 5}))];
    const expectedResult = [
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        30
      ],
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        100
      ],
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        210
      ],
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        {
          "state": 280
        },
        {
          "state": 360
        },
        360
      ]
    ];
    expect(result).toEqual(expectedResult);
  });

  it('works: like a redux store, unhandled actions are yielded through!!', () => {
    const initialState = {state: 0};
    const ofType = actionType => ({type, payload}) => type === actionType ? payload : F.reduced({type, payload});

    const store = pipe(
      ofType('input'),
      n => n * 2,
      n => range({start: 1, end: n + 1}),
      pipe(
        n => n * 10
      ),
      iter => scan((acc, input) => ({...acc, state: acc.state + input}), () => initialState, iter, ({state}) => state),
      transformedGen => [...transformedGen],
      // result => result.slice(-1),
    );

    const actions = ([
      {type: 'input', payload: 1},
      {type: 'something-else', payload: Infinity},
      {type: 'input', payload: 2},
      {type: 'input', payload: 3},
      {type: 'something-else', payload: Infinity},
      {type: 'input', payload: 4},
    ]);

    const stateHistory = [...store(actions)];

    const expectedResult = [
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        30
      ],
      {
        "payload": Infinity,
        "type": "something-else"
      },
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        100
      ],
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        210
      ],
      {
        "payload": Infinity,
        "type": "something-else"
      },
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        {
          "state": 280
        },
        {
          "state": 360
        },
        360
      ]
    ];
    expect(stateHistory).toEqual(expectedResult);
  });

  it('works: unhandled actions are yielded through and can be handled in a follow up pipe', () => {
    const initialState = {state: 0};
    const ofType = actionType => action => action.type === actionType ? action.payload : F.reduced(action);

    const store = pipe(
      ofType('input'),
      n => n * 2,
      n => range({start: 1, end: n + 1}),
      pipe(
        n => n * 10
      ),
      iter => scan((acc, input) => ({...acc, state: acc.state + input}), () => initialState, iter, ({state}) => state),
      transformedGen => [...transformedGen],
      // result => result.slice(-1),
    );

    const actions = ([
      {type: 'input', payload: 1},
      {type: 'something-else', payload: Infinity},
      {type: 'input', payload: 2},
      {type: 'input', payload: 3},
      {type: 'something-else', payload: Infinity},
      {type: 'input', payload: 4},
    ]);

    const stateHistory = [
      ...pipe(
        ofType('something-else'),
        unhandledAction => `rejected action of type: ${unhandledAction.type}`
    )(store(actions))
    ];

    const expectedResult = [
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        30
      ],
      "rejected action of type: undefined",
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        100
      ],
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        210
      ],
      "rejected action of type: undefined",
      [
        {
          "state": 10
        },
        {
          "state": 30
        },
        {
          "state": 60
        },
        {
          "state": 100
        },
        {
          "state": 150
        },
        {
          "state": 210
        },
        {
          "state": 280
        },
        {
          "state": 360
        },
        360
      ]
    ];
    expect(stateHistory).toEqual(expectedResult);
  });
});

describe('scenario: pipeWith(...pipelineHigherOrderFns)(ctx)', () => {
  it('works: calls each H.O.Function with (ctx)(value)', () => {
    const liftInto = fn => ctx => value => ctx.postprocess(fn(ctx.preprocess(value)));
    const strIntStr = {preprocess: str => parseInt(str, 10), postprocess: n => `${n}`};

    const result = pipeWith(strIntStr)(
      liftInto(n => n * 10),
      liftInto(n => n + 1)
    )(['1', '2', '3', '4']);
    const expectedResult = [
      "11",
      "21",
      "31",
      "41"
    ];
    expect([...result]).toEqual(expectedResult);
  });

  it('works: pipeline functions can accept the ctx themselves for specialized interaction', () => {
    const strIntStr = {preprocess: str => parseInt(str, 10), postprocess: n => `${n}`};

    const result = pipeWith(strIntStr)(
      ctx => n => ctx.postprocess(ctx.preprocess(n) * 10),
      ctx => n => `result: ${ctx.preprocess(n) + 1}`,
    )(['1', '2', '3', '4']);
    const expectedResult = [
      "result: 11",
      "result: 21",
      "result: 31",
      "result: 41"
    ];
    expect([...result]).toEqual(expectedResult);
  });
});
