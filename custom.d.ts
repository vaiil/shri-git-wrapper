import { Git } from './git'

declare namespace Express {
  export interface Request {
    repo?: Git
  }
}
