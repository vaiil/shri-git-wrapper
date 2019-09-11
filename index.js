const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

class Git {
  constructor (pathToRepo) {
    this.path = path.resolve(pathToRepo)
  }

  static downloadRepository (url, pathToParent, repoDirName) {
    return new Promise((resolve, reject) => {
      const parentDirectory = path.resolve(pathToParent)
      if (!fs.existsSync(pathToParent)) {
        reject(`Cannot open dir ${parentDirectory}`)
        return
      }
      let cmd = `git clone ${url}`
      if (repoDirName) {
        cmd += ' ' + repoDirName
      }

      exec(
        cmd, {
          cwd: parentDirectory
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error, stdout, stderr)
            return
          }
          resolve(stdout, stderr)

        }
      )
    })
  }
}

module.exports = Git