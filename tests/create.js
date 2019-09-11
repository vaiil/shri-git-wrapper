const git = require('../index')

git
  .downloadRepository('https://github.com/hanford/await-exec', '/js-test-dir')
  .then()
  .catch((error) => console.log(error))