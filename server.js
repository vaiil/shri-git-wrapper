const express = require('express')
const fs = require('fs')
const path = require('path')
const util = require('util')
require('dotenv').config()

const app = express()

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
      return await util.promisify(fs.readdir)(path.resolve(process.env.GIT_REPO_DIR))
    }
  )
)

app.listen(3000)
