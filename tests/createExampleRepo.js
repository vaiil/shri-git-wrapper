const path = require('path')
const { dir } = require('tmp-promise')
const exec = require('await-exec')

module.exports = async (callback) => {
  const tmpDir = await dir({ unsafeCleanup: true })

  try {
    await exec(path.resolve(__dirname, './create-repo.sh'), {
      cwd: tmpDir.path
    })

    await callback(tmpDir.path)

  } catch (e) {
    // Clear dir anyway
    await tmpDir.cleanup()

    throw e
  }

  await tmpDir.cleanup()
}
