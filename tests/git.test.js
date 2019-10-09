const Git = require('../git')
const dir = require('tmp-promise').dir
const getDirs = require('../get-dirs')

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

  it('non-existing dir', async () => {
    await expect(downloadThisRepo('/non-existing-path')).rejects.toThrow()
  })
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

  it('This repo - second commit', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const commits = await repo.getCommits('975f365')

    expect(commits).toHaveLength(twoFirstCommits.length)
    commits.forEach((commit, i) => expectSameCommit(commit, twoFirstCommits[i]))

    await tmpDir.cleanup()
  })

  it('This repo - master', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const commits = await repo.getCommits('master')

    expect(commits).toBeInstanceOf(Array)
    commits.slice(-2).forEach((commit, i) => expectSameCommit(commit, twoFirstCommits[i]))

    await tmpDir.cleanup()
  })

  it('Large repo', async () => {
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

describe('getDiff', () => {
  it('can get diff of existing branches/commits', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    // It shouldn't fail
    expect(typeof await repo.getDiff('975f365')).toEqual('string') // Get second commit
    expect(typeof await repo.getDiff('812dcf0')).toEqual('string') // Get first commit
    expect(typeof await repo.getDiff()).toEqual('string') // Get diff of master
    expect(typeof await repo.getDiff('master')).toEqual('string') // Try get diff of master

    await tmpDir.cleanup()
  })

  it('throw error when branch doesnt exists', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)
    await expect(repo.getDiff('wrong-branch')).rejects.toThrow() // Wrong branch
  })

  it('throw error when branch doesnt ambiguous', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)
    await expect(repo.getDiff('4')).rejects.toThrow() // Ambiguous ref

    await tmpDir.cleanup()
  })
})

describe('getBlobReader', () => {
  it('read README', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const blobReader = repo.getBlobReader('README.md', '812dcf0')

    const wait = () => new Promise(
      resolve => {
        let message = ''
        blobReader.stdout.on('data', msg => {
          message += msg
        })
        blobReader.on('close', () => resolve(message))
      }
    )

    const readme = await wait()

    expect(readme).toEqual('Node.js wrapper for git')

    await tmpDir.cleanup()
  })
})

describe('scanDir', () => {
  it('without path', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const items = await repo.scanDir({ commit: '812dcf0' })

    expect(items).toEqual([
      {
        'path': 'README.md',
        'commitHash': '812dcf0',
        'committer': 'vail',
        'timestamp': '1568242431',
        'commitSubject': 'initial commit',
        'name': 'README.md',
        'type': 'file'
      }
    ])
  })

  it('with path', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const items = await repo.scanDir({
      commit: '8b6b3cc',
      path: 'tests'
    })

    expect(items).toEqual([
      {
        'path': 'tests/git.test.js',
        'commitHash': '124bdb4',
        'committer': 'vail',
        'timestamp': '1568467216',
        'commitSubject': 'Add some tests',
        'name': 'git.test.js',
        'type': 'file'
      }
    ])

    await tmpDir.cleanup()
  })

  it('with wrong path', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    const items = await repo.scanDir({
      commit: '8b6b3cc',
      path: 'testssss'
    })

    expect(items).toEqual([])

    await tmpDir.cleanup()
  })
})

describe('delete', () => {
  it('Download and delete', async () => {
    const tmpDir = await dir({ unsafeCleanup: true })

    const repo = await downloadThisRepo(tmpDir.path)

    let items = await getDirs(tmpDir.path)

    expect(items).toEqual(['test'])

    await repo.delete()

    items = await getDirs(tmpDir.path)

    expect(items).toEqual([])

    await tmpDir.cleanup()
  })
})
