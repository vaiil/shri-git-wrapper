const fs = require('fs')
const path = require('path')
const exec = require('await-exec')
const spawn = require('child_process').spawn
const rimraf = require('rimraf')
const util = require('util')

class Git {
  constructor (pathToRepo) {
    this.path = path.resolve(pathToRepo)
    this.processOptions = {
      cwd: pathToRepo
    }
  }

  async getCommits (startCommit = 'master', limit = null) {
    let cmd

    if (limit) {
      cmd = `git rev-list --oneline --timestamp --max-count=${limit} ${startCommit}`
    } else {
      cmd = `git rev-list --oneline --timestamp ${startCommit}`
    }

    const data = await exec(cmd, this.processOptions)

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

  async getDiff (commit = 'master') {
    const result = await exec(`git --no-pager show ${commit}`, this.processOptions)
    return result.stdout.toString()
  }

  getBlobReader (path, commit = 'master') {
    return spawn('git', ['show', commit + ':' + path], this.processOptions)
  }

  async scanDir ({ path: directory = '', commit = 'master' }) {
    let dir = directory
    if (dir && !dir.endsWith('/')) {
      dir += '/'
    }
    const result = await exec(`git ls-tree --name-only ${commit} ${dir}`, this.processOptions)
    return result.stdout
      .split(/\r?\n/)
      .filter(v => v !== '')
      .map(file => path.basename(file))
  }

  async delete () {
    await util.promisify(rimraf)(this.path)
  }

  static async downloadRepository (url, pathToParent, repoName) {
    const parentDirectory = path.resolve(pathToParent)

    if (!fs.existsSync(pathToParent)) {
      throw new Error('Cannot open directory')
    }

    await exec(`git clone -q ${url} ${repoName}`, {
      cwd: parentDirectory
    })
    // const cloneProcess = spawn(
    //   'git', ['clone', '-q', url, repoName], {
    //     cwd: parentDirectory
    //   }
    // )

    // const wait = () => new Promise((resolve, reject) => {
    //   cloneProcess.stdout.on('data', (data) => {
    //     if (data) {
    //       reject(new Error(data.toString()))
    //       cloneProcess.kill('SIGTERM')
    //     }
    //   })
    //
    //   cloneProcess.stdin.on('data', (data) => {
    //     console.log(data)
    //   })
    //
    //   cloneProcess.stderr.on('data', (data) => {
    //     if (data) {
    //       reject(new Error(data.toString()))
    //     }
    //   })
    //
    //   cloneProcess.on('close', () => {
    //     resolve()
    //   })
    // })
    //
    // await wait()

    return new this(path.resolve(parentDirectory, repoName))
  }
}

module.exports = Git
