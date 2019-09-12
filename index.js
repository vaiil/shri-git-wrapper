const fs = require('fs')
const path = require('path')
const exec = require('await-exec')
// const spawn = require('child_process').spawn

class Git {
  constructor (pathToRepo) {
    this.path = path.resolve(pathToRepo)
  }

  async getCommits (startCommit = 'HEAD') {
    const data = await exec('git rev-list --oneline --timestamp ' + startCommit)

    return data.stdout.split(/\r?\n/)
      .map(line => {
        const parsed = line.match(/^(\d*) (\w*) (.*)$/)
        if (!parsed || parsed.length !== 4) {
          return null
        }
        return {
          date: new Date(parseInt(parsed[1]) * 1000),
          ref: parsed[2],
          message: parsed[3]
        }
      })
      .filter(v => v !== null)
  }

  async getDiff (commit = 'HEAD') {
    const result = await exec('git diff ' + commit)
    return result.stdout
  }

  // readBlob (handler, path, commit = 'HEAD') {
  //   spawn('git', ['show', ]
  // }

  static async downloadRepository (url, pathToParent, repoName) {
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
