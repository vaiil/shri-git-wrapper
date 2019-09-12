const fs = require('fs')
const path = require('path')
const { dir } = require('tmp-promise')
const exec = require('await-exec')

const main = async () => {
  const tmpDir = await dir({ unsafeCleanup: true })

  console.log('Temp directory created!')

  await exec(path.resolve(__dirname, './create-repo.sh'), {
    cwd: tmpDir.path
  }).catch(er => console.log(er))

  await tmpDir.cleanup()
  console.log('Temp directory removed!')
}

main()
