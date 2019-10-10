const path = require('path')
const util = require('util')
const fs = require('fs')

module.exports = async (parentDir: string) => {
  const items = await util.promisify(fs.readdir)(path.resolve(parentDir))
  const dirNames = []
  for (let item of items) {
    const stats = await util.promisify(fs.stat)(path.resolve(parentDir, item))
    if (stats.isDirectory()) {
      dirNames.push(item)
    }
  }
  return dirNames
}
