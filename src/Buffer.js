/* @flow */

export class ReadError {
  message: string
  name: "ReadError"
  stack: string
  constructor(message:string) {
    this.message = message
    this.name = "ReadError"
    this.stack = new Error(message).stack
  }
}
export class WriteError {
  message: string
  name: "WriteError"
  stack: string
  constructor(message:string) {
    this.message = message
    this.name = "WriteError"
    this.stack = new Error(message).stack
  }
}

export class Buffer <data> {
  static writeError: WriteError
  static readError: ReadError
  static ReadError: typeof ReadError
  static WriteError: typeof WriteError
  write (chunk:data):?WriteError {
    return Buffer.writeError
  }
  read ():data|ReadError {
    return Buffer.readError
  }
}
Buffer.WriteError = WriteError
Buffer.ReadError = ReadError
Buffer.readError = new ReadError('Not enough data in buffer to perform a read')
Buffer.writeError = new WriteError('Not enough space in buffer to fit a write')

export default Buffer
