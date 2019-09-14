const express = require('express')
const getDirs = require('./get-dirs')
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
      return await getDirs(process.env.GIT_REPO_DIR)
    }
  )
)

app.get

app.listen(3000)
