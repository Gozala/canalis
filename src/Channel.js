/* @flow */

import Task from 'outtask'
import Buffer from './Buffer'
import FixedBuffer from './FixedBuffer'
import {WriteError, ReadError, PendingRead, PendingWrite, Pipe} from './Channel/Core'
import {enqueue} from './Channel/Scheduler'

const Task$prototype$execute = Task.prototype.execute

class Never {}
export type {Never}


export class Writer <message> {
  pipe: Pipe<message>
  constructor (pipe:Pipe<message>) {
    this.pipe = pipe
  }
  write(payload:message):Task<WriteError<message>, void> {
    return write(payload, this)
  }
  close <never> ():Task<never, void> {
    return close(this)
  }
}

export class Reader <message> {
  pipe: Pipe<message>
  constructor (pipe:Pipe<message>) {
    this.pipe = pipe
  }
  read():Task<ReadError, message> {
    return read(this)
  }
  close <never> ():Task<never, void> {
    return close(this)
  }
}


class Read <message> extends Task <ReadError, message> {
  pipe: Pipe<message>
  constructor (pipe:Pipe<message>) {
    super(Task$prototype$execute)
    this.pipe = pipe
  }
  execute (succeed:(a:message) => void, fail:(x:ReadError) => void):?PendingRead<message> {
    const {pipe} = this
    const {buffer, closed, writeQueue} = pipe
    enqueue(pipe)
    let chunk = buffer.read()
    if (chunk instanceof Buffer.ReadError) {
      const pendingRead = new PendingRead(succeed, fail, false)
      pipe.readQueue.push(pendingRead)
      return pendingRead
    } else {
      succeed(chunk)
    }
  }
  abort (read:?PendingRead<message>):void {
    if (read != null) {
      read.aborted = true
    }
  }
}

class Write <message> extends Task <WriteError<message>, void> {
  payload: message
  pipe: Pipe<message>
  constructor (pipe:Pipe<message>, payload:message) {
    super(Task$prototype$execute)
    this.pipe = pipe
    this.payload = payload
  }
  execute (succeed:(a:void) => void, fail:(x:WriteError<message>) => void):?PendingWrite<message> {
    const {pipe, payload} = this
    const {buffer, closed, readQueue} = pipe
    // Wake up pipe if it is parked.
    enqueue(pipe)

    // If pipe is closed or buffer is full, create a pending write. This will
    // gives us following guarantees:
    // - Writing to colsed channel fails on next tick.
    // - Writing to full channel queues writes until next read.
    if (closed || buffer.write(payload) instanceof Buffer.WriteError) {
      const pendingWrite = new PendingWrite(succeed, fail, payload, false)
      pipe.writeQueue.push(pendingWrite)
      return pendingWrite
    // If write to buffer was successful succeed without blocking.
    } else {
      succeed()
    }
  }
  abort (write:?PendingWrite<message>):void {
    if (write != null) {
      write.aborted = true
    }
  }
}

class Close <never, message> extends Task <never, void> {
  pipe: Pipe<message>
  constructor (pipe:Pipe<message>) {
    super(Task$prototype$execute)
    this.pipe = pipe
  }
  execute (succeed:(a:void) => void, fail:(x:never) => void):void {
    const {pipe} = this
    enqueue(pipe)
    pipe.closed = true
    succeed()
  }
}


export const open = <never, message>
  (buffer:?Buffer<message>):Task<never, Channel<message>> =>
  new Task((succeed, fail) => {
    const pipe = new Pipe(buffer || new FixedBuffer(0), [], [], false, false)
    succeed(new Channel(new Writer(pipe), new Reader(pipe)))
  })

export const write = <message, _>
  (payload:message, writer:Writer<message>):Task<WriteError<message>, void> =>
  new Write(writer.pipe, payload)

export const read = <message, _>
  (reader:Reader<message>):Task<ReadError, message> =>
  new Read(reader.pipe)

export const close = <never, message>
  (port:Reader<message>|Writer<message>):Task<never, void> =>
  new Close(port.pipe)


export class Channel <message> {
  static read = read
  static write = write
  static close = close
  static open = open
  static ReadError = ReadError
  static WriteError = WriteError
  static Reader = Reader
  static Writer = Writer
  reader: Reader<message>
  writer: Writer<message>
  constructor(writer:Writer<message>, reader:Reader<message>) {
    this.writer = writer
    this.reader = reader
  }
  read():Task<ReadError, message> {
    return read(this.reader)
  }
  write(payload:message):Task<WriteError<message>, void> {
    return write(payload, this.writer)
  }
  close <never> ():Task<never, void> {
    return close(this.writer)
  }
}

export {ReadError, WriteError}
export default Channel
