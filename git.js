const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const spawn = childProcess.spawn
const rimraf = require('rimraf')
const util = require('util')
const asyncExecFile = util.promisify(childProcess.execFile)

class Git {
  constructor (pathToRepo) {
    this.path = path.resolve(pathToRepo)
    this.processOptions = {
      cwd: pathToRepo
    }
  }

  async getCommits (startCommit = 'master', limit = null) {
    const args = ['rev-list', '--oneline', '--timestamp']

    if (limit) {
      args.push(`--max-count=${limit}`)
    }

    args.push(startCommit)

    const data = await asyncExecFile('git', args, this.processOptions)

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
    const result = await asyncExecFile('git', ['--no-pager', 'show', commit], this.processOptions)
    return result.stdout.toString()
  }

  getBlobReader (path, commit = 'master') {
    return spawn('git', ['show', commit + ':' + path], this.processOptions)
  }

  async scanDir ({ path: directory = '.', commit = 'master' }) {
    let dir = directory
    if (dir && !dir.endsWith('/')) {
      dir += '/'
    }
    const result = await asyncExecFile('git', ['ls-tree', '--name-only', commit, dir], this.processOptions)
    return result.stdout
      .split(/\r?\n/)
      .filter(v => v !== '')
      .map(file => path.basename(file))
  }

  async delete () {
    await util.promisify(rimraf)(this.path)
  }

  stat (commit = 'master') {
    const ls = spawn('git', ['grep', '-Il', '--name-only', '\'\'', commit], this.processOptions)
    const cat = spawn('xargs', ['git', '--no-pager', 'show'], this.processOptions)
    ls.stdout.pipe(cat.stdin)
    const stats = {}
    return new Promise((resolve, reject) => {
      cat.stdout.on('data', buffer => {
        let str = buffer.toString()
        if (str) {
          for (let char of str) {
            if (!stats[char]) {
              stats[char] = 0
            }
            stats[char]++
          }
        }
      })

      ls.stderr.on('data', (data) => reject(data.toString()))
      cat.stderr.on('data', (data) => reject(data.toString()))
      cat.on('close', () => resolve(stats))
    })
  }

  static async downloadRepository (repoUrl, pathToParent, repoName) {
    const parentDirectory = path.resolve(pathToParent)

    if (!fs.existsSync(pathToParent)) {
      throw new Error('Cannot open directory')
    }

    await asyncExecFile('git', ['clone', '-q', repoUrl, repoName], {
      cwd: parentDirectory,
      env: {
        'GIT_TERMINAL_PROMPT': 0
      }
    })

    return new this(path.resolve(parentDirectory, repoName))
  }
}

module.exports = Git
