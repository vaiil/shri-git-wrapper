const Git = require('../index')

Git
  .downloadRepository('https://github.com/hanford/await-exec', '/js-test-dir')
  .then()
  .catch((error) => console.log(error))
