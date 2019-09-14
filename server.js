const express = require('express')
const path = require('path')
const minimist = require('minimist')
const getDirs = require('./get-dirs')

require('dotenv').config()
const Git = require('./git')

let reposDir = process.env.GIT_REPO_DIR

const argv = minimist(process.argv)
if (argv.path) {
  reposDir = argv.path
}

reposDir = path.resolve(reposDir)

console.log('Repos dir: ' + reposDir)

const app = express()

app.use(express.json())

function jsonProxyRequest (handle) {
  return async (req, res) => {
    try {
      res.json(await handle(req, res))
    } catch (e) {
      res.status(400)
      res.json(e)
    }
  }
}

app.get(
  '/api/repos',
  jsonProxyRequest(
    async () => {
      return await getDirs(reposDir)
    }
  )
)

app.post(
  '/api/repos/:repo',
  jsonProxyRequest(
    async (req) => {
      await Git.downloadRepository(req.body['repo-url'], reposDir, req.params.repo)
      return {
        status: 'success'
      }
    }
  )
)

app.use('/api/repos/:repo', (req, res, next) => {
  req.repo = new Git(path.resolve(reposDir, req.params.repo))
  next()
})

app.get(
  '/api/repos/:repo/commits/:commit?',
  jsonProxyRequest(async (req) => await req.repo.getCommits(req.params.commit))
)

app.get(
  '/api/repos/:repo/commits/:commit/diff',
  jsonProxyRequest(async (req) => await req.repo.getDiff(req.params.commit))
)

app.get(
  ['/api/repos/:repo', '/api/repos/:repo/tree/:commit?/:path([^/]*)?'],
  jsonProxyRequest(async (req) => await req.repo.scanDir({ path: req.params.path, commit: req.params.commit }))
)

app.get(
  '/api/repos/:repo/blob/:commit/:path([^/]*)',
  (req, res) => {
    const blobReader = req.repo.getBlobReader(req.params.path, req.params.commit)
    blobReader.stdout.on('data', data => res.write(data))
    blobReader.stderr.on('data', data => {
      res.status('400')
      res.write(data)
    })
    blobReader.on('close', () => res.end())
  }
)

app.get(
  '/api/repos/:repo/paginate-commits/:limit/:commit?',
  jsonProxyRequest(async (req) => {
    const limit = parseInt(req.params.limit)
    const items = await req.repo.getCommits(req.params.commit, limit + 1)
    const lastItem = items.pop()
    if (items.length === limit) {
      let url = req.protocol
        + '://'
        + req.get('host')
        + `/api/repos/${req.params.repo}/paginate-commits/${req.params.limit}/${lastItem.ref}`
      return {
        items: items,
        next: url
      }
    } else {
      return {
        items: items,
        next: null
      }
    }
  })
)


app.get(
  '/api/repos/:repo/stat/:commit?',
  jsonProxyRequest(async (req) => await req.repo.stat(req.params.commit))
)

app.delete(
  '/api/repos/:repo',
  jsonProxyRequest(async (req) => await req.repo.delete())
)

app.listen(3000)
