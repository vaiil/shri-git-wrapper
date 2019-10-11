import path from 'path'
import express from 'express'
import minimist from 'minimist'
import cors from 'cors'
import process from 'process'

import getDirs from './get-dirs'

import { config } from 'dotenv'

import Git from './git'

config()

let reposDir = process.env.GIT_REPO_DIR
let port = process.env.PORT || 3000

const argv = minimist(process.argv)

if (argv.path) {
  reposDir = argv.path
}

if (argv.port) {
  port = argv.port
}

if (reposDir === undefined) {
  console.log('Repos dir not given!')
  process.exit(1)
}

const reposPath = path.resolve(reposDir!)

console.log('Repos dir: ' + reposPath)

const app = express()

app.use(cors())
app.use(express.json())

app.use(async (req, res, next) => {
  try {
    res.json(await next(req))
  } catch (e) {
    res.status(400)
    res.json({ message: e.stderr })
  }
})

app.get('/api/repos', async () => await getDirs(reposPath))

app.post(
  '/api/repos/:repo',
  async (req) => {
    await Git.downloadRepository(
      req.body['repo-url'],
      reposPath,
      req.params.repo
    )
    return {
      status: 'success'
    }
  }
)

app.use('/api/repos/:repo', (req, res, next) => {
  req.repo = new Git(path.resolve(reposPath, req.params.repo))
  next()
})

app.get(
  '/api/repos/:repo/commits/:commit?',
  async (req) => await req.repo.getCommits(req.params.commit)
)

app.get(
  '/api/repos/:repo/commits/:commit/diff',
  async (req) => await req.repo.getDiff(req.params.commit)
)

app.get(
  ['/api/repos/:repo', '/api/repos/:repo/tree/:commit?/:path([^/]*)?'],
  async (req) =>
    await req.repo.scanDir({
      path: req.params.path,
      commit: req.params.commit
    })
)

app.get('/api/repos/:repo/blob/:commit/:path([^/]*)', (req, res) => {
  const blobReader = req.repo.getBlobReader(req.params.path, req.params.commit)
  blobReader.stdout.on('data', data => res.write(data))
  blobReader.stderr.on('data', data => {
    res.status(400)
    res.write(data)
  })
  blobReader.on('close', () => res.end())
})

app.get(
  '/api/repos/:repo/paginate-commits/:limit/:commit?',
  async (req) => {
    const limit = parseInt(req.params.limit)
    const items = await req.repo.getCommits(req.params.commit, limit + 1)
    const lastItem = items.pop()
    if (items.length === limit) {
      let url =
        req.protocol +
        '://' +
        req.get('host') +
        `/api/repos/${req.params.repo}/paginate-commits/${req.params.limit}/${lastItem!.ref}`
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
  }
)

app.get(
  '/api/repos/:repo/stat/:commit?',
  async (req) => await req.repo.stat(req.params.commit)
)

app.delete(
  '/api/repos/:repo',
  async (req) => await req.repo.delete()
)

app.listen(port)
