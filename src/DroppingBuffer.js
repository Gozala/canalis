/* @flow */

import Buffer from './Buffer'
import type {ReadError, WriteError} from './Buffer'

class DroppingBuffer <data> extends Buffer <data> {
  size: number
  chunks: Array<data>
  constructor (size:number) {
    super()
    this.size = size
    this.chunks = []
  }
  write (chunk:data):?WriteError {
    if (this.chunks.length !== this.size) {
      this.chunks.unshift(chunk)
    }
  }
  read ():ReadError|data {
    const {chunks} = this
    if (chunks.length > 0) {
      return chunks.pop()
    } else {
      return Buffer.readError
    }
  }
}
exports.DroppingBuffer = DroppingBuffer
