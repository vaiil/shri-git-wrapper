declare namespace Express {
  export interface Request {
    repo: import('../../src/git').default
  }
}
