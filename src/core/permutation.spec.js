const F = require('functional-pipelines');

const {permute, generatorCombinator, generatorCombinatorPermutator} = require('./permutations');
const {range} = require('./iter-tools/iterator');
const {pipe} = require('./pipe');

describe('scenario: permutation generator choosing from list of values', () => {
  it('works: generates the correct number of all possible unique permutation', () => {
    const permuteGen = permute(['A', 'B', 'C', 'D', 'E']);
    const result = [...permuteGen];
    const resultSet = new Set(result);
    expect(resultSet.size).toEqual(result.length);
    expect(resultSet.size).toEqual(120); // factorial(5)
  });
});

describe('scenario: combination generator choosing from list of values', () => {
  it('works: generates the correct number of all possible unique combinations', () => {
    const colors = ['BLACK', 'WHITE'];
    const letters = ['A', 'B', 'C'];
    const numbers = [1, 2, 3, 4];

    const createGeneratorFn = source => () => pipe(index => source[index])(range({end: source.length}));

    const resultGenerator = generatorCombinator([
      createGeneratorFn(colors),
      createGeneratorFn(letters),
      createGeneratorFn(numbers)
    ]);

    const result = [...F.take(1000, resultGenerator)];
    const resultSet = new Set(result);

    const BLACK = 'BLACK';
    const WHITE = 'WHITE';
    const A = 'A';
    const B = 'B';
    const C = 'C';

    const sources = [
      [BLACK, WHITE],
      [A, B, C],
      [1, 2, 3, 4]
    ];

    const expectedResult = [
      ['BLACK', 'A', 1], ['WHITE', 'A', 1],
      ['BLACK', 'B', 1], ['WHITE', 'B', 1],
      ['BLACK', 'C', 1], ['WHITE', 'C', 1],
      ['BLACK', 'A', 2], ['WHITE', 'A', 2],
      ['BLACK', 'B', 2], ['WHITE', 'B', 2],
      ['BLACK', 'C', 2], ['WHITE', 'C', 2],
      ['BLACK', 'A', 3], ['WHITE', 'A', 3],
      ['BLACK', 'B', 3], ['WHITE', 'B', 3],
      ['BLACK', 'C', 3], ['WHITE', 'C', 3],
      ['BLACK', 'A', 4], ['WHITE', 'A', 4],
      ['BLACK', 'B', 4], ['WHITE', 'B', 4],
      ['BLACK', 'C', 4], ['WHITE', 'C', 4]
    ];


    // const expectedResult = [
    //   // 0: off 1: off 2: off
    //   [BLACK, A, 1],
    //   // 0: on 1: off 2: off
    //   [WHITE, A, 1],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, B, 1],
    //   // 0: on 1: off 2: off
    //   [WHITE, B, 1],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, C, 1],
    //   // 0: on 1: off 2: off
    //   [WHITE, C, 1],
    //   // 0: restart 1: restart 2: 1
    //   [BLACK, A, 2],
    //   // 0: on 1: off 2: off
    //   [WHITE, A, 2],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, B, 2],
    //   // 0: on 1: off 2: off
    //   [WHITE, B, 2],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, C, 2],
    //   // 0: on 1: off 2: off
    //   [WHITE, C, 2],
    //   // 0: restart 1: restart 2: 1
    //   [BLACK, A, 3],
    //   // 0: on 1: off 2: off
    //   [WHITE, A, 3],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, B, 3],
    //   // 0: on 1: off 2: off
    //   [WHITE, B, 3],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, C, 3],
    //   // 0: on 1: off 2: off
    //   [WHITE, C, 3],
    //   // 0: restart 1: restart 2: 1
    //   [BLACK, A, 4],
    //   // 0: on 1: off 2: off
    //   [WHITE, A, 4],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, B, 4],
    //   // 0: on 1: off 2: off
    //   [WHITE, B, 4],
    //   // 0: restart 1: 1 2: off
    //   [BLACK, C, 4],
    //   // 0: on 1: off 2: off
    //   [WHITE, C, 4],
    //   // 0: restart 1: restart 2: *restart last iterable
    //   // 0: end 1: end 2: end
    // ];

    // expect(result.length).toEqual(expectedResult.length);
    expect(result).toEqual(expectedResult);
    expect(resultSet.size).toEqual(result.length);
    expect(result.length).toEqual(24); // initially assumed to be 120 combination @TODO check combination count
  });
  it('works: generates the correct number of all possible unique combinations and permutations of each of them', () => {
    const colors = ['BLACK', 'WHITE'];
    const letters = ['A', 'B', 'C'];
    const numbers = [1, 2, 3, 4];

    const createGeneratorFn = source => () => pipe(index => source[index])(range({end: source.length}));

    const resultGenerator = generatorCombinatorPermutator([
      createGeneratorFn(colors),
      createGeneratorFn(letters),
      createGeneratorFn(numbers)
    ]);

    const result = [...F.take(10000, resultGenerator)];
    const resultSet = new Set(result);

    const BLACK = 'BLACK';
    const WHITE = 'WHITE';
    const A = 'A';
    const B = 'B';
    const C = 'C';

    const sources = [
      [BLACK, WHITE],
      [A, B, C],
      [1, 2, 3, 4]
    ];


    const expectedResult = [
      ...permute(['BLACK', 'A', 1]),
      ...permute(['WHITE', 'A', 1]),
      ...permute(['BLACK', 'B', 1]),
      ...permute(['WHITE', 'B', 1]),
      ...permute(['BLACK', 'C', 1]),
      ...permute(['WHITE', 'C', 1]),
      ...permute(['BLACK', 'A', 2]),
      ...permute(['WHITE', 'A', 2]),
      ...permute(['BLACK', 'B', 2]),
      ...permute(['WHITE', 'B', 2]),
      ...permute(['BLACK', 'C', 2]),
      ...permute(['WHITE', 'C', 2]),
      ...permute(['BLACK', 'A', 3]),
      ...permute(['WHITE', 'A', 3]),
      ...permute(['BLACK', 'B', 3]),
      ...permute(['WHITE', 'B', 3]),
      ...permute(['BLACK', 'C', 3]),
      ...permute(['WHITE', 'C', 3]),
      ...permute(['BLACK', 'A', 4]),
      ...permute(['WHITE', 'A', 4]),
      ...permute(['BLACK', 'B', 4]),
      ...permute(['WHITE', 'B', 4]),
      ...permute(['BLACK', 'C', 4]),
      ...permute(['WHITE', 'C', 4])
    ];

    expect(result.length).toEqual(expectedResult.length);
    expect(result).toEqual(expectedResult);
    expect(resultSet.size).toEqual(result.length);
    expect(result.length).toEqual(144); // initially assumed to be 120 combination @TODO check combination count
  });
});

