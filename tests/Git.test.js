const Git = require('../index')
const dir = require('tmp-promise').dir

describe('downloadRepository', () => {
  test('base download', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    async function downloadThisRepo () {
      return await Git.downloadRepository('git@github.com:vaiil/shri-git-wrapper.git', tmpDir.path, 'test')
    }

    const repo = await downloadThisRepo()

    expect(repo).toBeInstanceOf(Git)

    await expect(downloadThisRepo()).rejects.toThrow()

    await tmpDir.cleanup()
  })

  // test('download non-existing repo', async () => {
  //   const tmpDir = await dir({ unsafeCleanup: true })
  //
  //   await expect(Git.downloadRepository('git@github.com:vaiil/Ive-not-created-this.git', tmpDir.path, 'test')).rejects.toThrow()
  //   await expect(Git.downloadRepository('https://github.com/some-user/I-hope-he-wont-create-this-repo.git', tmpDir.path, 'test')).rejects.toThrow()
  //
  //   await tmpDir.cleanup()
  // })
})
