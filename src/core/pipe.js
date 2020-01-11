const F = require('functional-pipelines');

const pipe = (...pipeline) => enumerator => F.toIterator(function* (enumerator) {
  const pipelineFn = F.pipes(...pipeline);
  for (const entry of F.iterator(enumerator)) {
    // console.log({entry});
    yield pipelineFn(entry);
  }
}(enumerator)); // IIF here is simply a lazy call to the generator function and fixing the premature termination ES-BUG for the client-code

const pipeWith = ctx => (...pipeline) => enumerator => F.toIterator(function* (enumerator) {
  const pipelineFn = F.pipeWith(...pipeline);
  for (const entry of F.iterator(enumerator)) {
    // console.log({entry});
    yield pipelineFn(ctx)(entry);
  }
}(enumerator)); // IIF here is simply a lazy call to the generator function and fixing the premature termination ES-BUG for the client-code


module.exports = {
  pipe,
  pipeWith
};
