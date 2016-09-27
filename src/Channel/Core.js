/* @flow */

import type Buffer from '../Buffer'

export class Pipe <message> {
  buffer: Buffer<message>
  readQueue: Array<PendingRead<message>>
  writeQueue: Array<PendingWrite<message>>
  closed: boolean
  scheduled: boolean
  constructor (buffer:Buffer<message>,
              readQueue:Array<PendingRead<message>>,
              writeQueue:Array<PendingWrite<message>>,
              closed:boolean,
              scheduled:boolean) {
    this.buffer = buffer
    this.readQueue = readQueue
    this.writeQueue = writeQueue
    this.closed = closed
    this.scheduled = scheduled
  }
}

export class PendingWrite <message> {
  succeed: (input:void) => void
  fail: (error:WriteError<message>) => void
  payload: message
  aborted: boolean
  constructor (
    succeed:(input:void) => void,
    fail:(error:WriteError<message>) => void,
    payload: message,
    aborted:boolean
  ) {
    this.succeed = succeed
    this.fail = fail
    this.payload = payload
    this.aborted = aborted
  }
}

export class PendingRead <message> {
  succeed: (input:message) => void
  fail: (error:ReadError) => void
  aborted: boolean
  constructor (
    succeed: (input:message) => void,
    fail: (error:ReadError) => void,
    aborted: boolean
  ) {
    this.succeed = succeed
    this.fail = fail
    this.aborted = aborted
  }
}


export class WriteError <message> {
  payload: message
  stack: string
  message = 'Failed to write into channel. This means channel is closed.'
  name = 'WriteError'
  constructor (payload:message) {
    this.payload = payload
    this.stack = new Error().stack
  }
}

export class ReadError {
  name = 'ReadError'
  message = 'Failed to read from channel. This means channel is closed buffered data is exhasted.'
  stack: string
  constructor() {
    this.stack = new Error().stack
  }
}
