import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
import rimraf from 'rimraf'

const spawn = childProcess.spawn
const asyncExecFile = util.promisify(childProcess.execFile)

class Git {
  readonly path: string
  readonly processOptions: childProcess.ProcessEnvOptions

  constructor(pathToRepo: string) {
    this.path = path.resolve(pathToRepo)
    this.processOptions = {
      cwd: pathToRepo
    }
  }

  async getCommits(startCommit = 'master', limit = null) {
    const args = ['rev-list', '--oneline', '--timestamp']

    if (limit) {
      args.push(`--max-count=${limit}`)
    }

    args.push(startCommit)

    const data = await asyncExecFile('git', args, this.processOptions)

    return data.stdout
      .split(/\r?\n/)
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

  async getDiff(commit = 'master') {
    const result = await asyncExecFile(
      'git',
      ['--no-pager', 'show', commit],
      this.processOptions
    )
    return result.stdout.toString()
  }

  getBlobReader(path: string, commit = 'master') {
    return spawn('git', ['show', commit + ':' + path], this.processOptions)
  }

  async getFilesystemObjectInfo(path: string, commit = 'master') {
    const fileRaw = await asyncExecFile(
      'git',
      [
        'log',
        '-1',
        '--oneline',
        '--format=%h%n%cn%n%ct%n%s',
        commit,
        '--',
        path
      ],
      this.processOptions
    )
    const fileData = fileRaw.stdout.split(/\r?\n/)
    return {
      path,
      commitHash: fileData[0],
      committer: fileData[1],
      timestamp: fileData[2],
      commitSubject: fileData[3]
    }
  }

  async scanDir({ path: directory = '.', commit = 'master' }) {
    let dir = directory
    if (dir && !dir.endsWith('/')) {
      dir += '/'
    }
    const files = await asyncExecFile(
      'git',
      ['ls-tree', commit, dir],
      this.processOptions
    )
    const resultPromises = files.stdout
      .split(/\r?\n/)
      .filter(v => v !== '')
      .map(
        row =>
          new Promise(async resolve => {
            const [additionalRow, file] = row.split('\t')
            const additionalData = additionalRow.split(' ')
            const filesystemObjectInfo = await this.getFilesystemObjectInfo(
              file,
              commit
            )

            resolve({
              ...filesystemObjectInfo,
              name: path.basename(file),
              type: additionalData[1] === 'tree' ? 'dir' : 'file'
            })
          })
      )

    return await Promise.all(resultPromises)
  }

  async delete() {
    await util.promisify(rimraf)(this.path)
  }

  stat(commit = 'master') {
    const ls = spawn(
      'git',
      ['grep', '-Il', '--name-only', '\'\'', commit],
      this.processOptions
    )
    const cat = spawn(
      'xargs',
      ['git', '--no-pager', 'show'],
      this.processOptions
    )
    ls.stdout.pipe(cat.stdin)
    const stats: Map<string, number> = new Map()
    return new Promise((resolve, reject) => {
      cat.stdout.on('data', buffer => {
        let str = buffer.toString()
        if (!str) {
          return
        }
        for (let char of str) {
          const current = stats.get(char)
          if (current) {
            stats.set(char, current + 1)
          } else {
            stats.set(char, 1)
          }
        }
      })

      ls.stderr.on('data', data => reject(data.toString()))
      cat.stderr.on('data', data => reject(data.toString()))
      cat.on('close', () => resolve(stats))
    })
  }

  static async downloadRepository(
    repoUrl: string,
    pathToParent: string,
    repoName: string
  ) {
    const parentDirectory = path.resolve(pathToParent)

    if (!fs.existsSync(pathToParent)) {
      throw new Error('Cannot open directory')
    }

    await asyncExecFile('git', ['clone', '-q', repoUrl, repoName], {
      cwd: parentDirectory,
      env: {
        GIT_TERMINAL_PROMPT: '0'
      }
    })

    return new this(path.resolve(parentDirectory, repoName))
  }
}

module.exports = Git
