const fs = require('fs')
const path = require('path')
const exec = require('await-exec')

class Git {
  constructor (pathToRepo) {
    this.path = path.resolve(pathToRepo)
  }

  async static downloadRepository (url, pathToParent, repoName) {
    const parentDirectory = path.resolve(pathToParent)

    if (!fs.existsSync(pathToParent)) {
      throw 'Cannot open directory'
    }

    let cmd = `git clone -q ${url} ${repoName}`


    await exec(
      cmd, {
        cwd: parentDirectory
      }
    )

    return new self(path.resolve(parentDirectory, repoName))
  }
}

module.exports = Git
