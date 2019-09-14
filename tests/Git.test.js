const Git = require('../index')
const dir = require('tmp-promise').dir

async function downloadThisRepo (parentDir) {
  return await Git.downloadRepository('git@github.com:vaiil/shri-git-wrapper.git', parentDir, 'test')
}

describe('downloadRepository', () => {
  it('base download', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    expect(repo).toBeInstanceOf(Git)

    await expect(downloadThisRepo(tmpDir.path)).rejects.toThrow()

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

describe('getCommits', () => {
  function expectSameCommit (commit, example) {
    expect(commit.date).toEqual(example.date)
    expect(commit.message).toEqual(example.message)
    expect(example.ref.startsWith(commit.ref)).toBeTruthy()
  }

  const twoFirstCommits = [
    {
      date: new Date('Thu Sep 12 01:59:28 2019 +0300'),
      ref: '975f3650264ffdb5b4aed539d6c05736791db66f',
      message: 'add empty package.json'
    },
    {
      date: new Date('Thu Sep 12 01:53:51 2019 +0300'),
      ref: '812dcf011018629d578747165358aa6306a396a5',
      message: 'initial commit'
    }
  ]

  it('Get this repo second commit', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const commits = await repo.getCommits('975f365')

    expect(commits).toHaveLength(twoFirstCommits.length)
    commits.forEach((commit, i) => expectSameCommit(commit, twoFirstCommits[i]))

    await tmpDir.cleanup()
  })

  it('Get master branch of this repo', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const commits = await repo.getCommits('master')

    expect(commits).toBeInstanceOf(Array)
    commits.slice(-2).forEach((commit, i) => expectSameCommit(commit, twoFirstCommits[i]))

    await tmpDir.cleanup()
  })

  it('Get long history commits', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await Git.downloadRepository('git@github.com:vuejs/vue.git', tmpDir.path, 'vue')

    const commits = await repo.getCommits('dev')

    expect(commits).toBeInstanceOf(Array)
    await tmpDir.cleanup()
  }, 60 * 1000)

  it('Error testing', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    await expect(repo.getCommits('wrong-branch')).rejects.toThrow() // Wrong branch
    await expect(repo.getCommits('4')).rejects.toThrow() // Ambiguous ref

    await tmpDir.cleanup()
  })
})
