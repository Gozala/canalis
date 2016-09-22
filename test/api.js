/* @flow */

import Channel from '../'
import * as canalis from '../'
import test from 'tape'

test('test module', test => {
  const exports = canalis

  test.ok(isClass(Channel), 'default export is class')
  test.equal(Channel, canalis.Channel)

  test.ok(isFunction(Channel.open), 'open is function')
  test.equal(Channel.open, canalis.open)

  test.ok(isFunction(Channel.read), 'read is function')
  test.equal(Channel.read, canalis.read)

  test.ok(isFunction(Channel.write), 'write is function')
  test.equal(Channel.write, canalis.write)

  test.ok(isFunction(Channel.close), 'close is funciton')
  test.equal(Channel.close, canalis.close)

  test.ok(isClass(Channel.Reader), 'Reader is class')
  test.equal(Channel.Reader, canalis.Reader)

  test.ok(isClass(Channel.Writer), 'Writer is class')
  test.equal(Channel.Writer, canalis.Writer)

  test.ok(isClass(Channel.ReadError), 'ReadError is class')
  test.equal(Channel.ReadError, canalis.ReadError)

  test.ok(isClass(Channel.WriteError), 'WriteError is class')
  test.equal(Channel.WriteError, canalis.WriteError)

  test.end()
})


test('test Channel', test => {
  test.ok(isClass(Channel), 'Channel is class')
  const {prototype} = Channel

  test.ok(isFunction(prototype.close), '.close is method')
  test.ok(isFunction(prototype.read), '.read is method')
  test.ok(isFunction(prototype.write), '.write is method')

  test.end()
})


test('test Reader', test => {
  const {Reader} = Channel
  const {prototype} = Reader

  test.ok(isClass(Reader), 'Reader is class')
  test.ok(isFunction(prototype.close), '.close is method')
  test.ok(isFunction(prototype.read), '.read is method')

  test.end()
})

test('test Writer', test => {
  const {Writer} = Channel
  const {prototype} = Writer

  test.ok(isClass(Writer), 'Writer is class')
  test.ok(isFunction(prototype.close), '.close is method')
  test.ok(isFunction(prototype.write), '.write is method')

  test.end()
})

test('test ReadError', test => {
  const error = new Channel.ReadError()

  test.equal(error.name, 'ReadError')
  test.ok(isString(error.stack))

  test.end()
})

test('test WriteError', test => {
  const error = new Channel.ReadError()

  test.equal(error.name, 'ReadError')
  test.ok(isString(error.stack))

  test.end()
})

const isObject =
  value =>
  value != null && typeof value == 'object'

const isFunction =
  value =>
  typeof value === 'function'

const isClass =
  value =>
  isFunction(value) && isObject(value.prototype)

const isString =
  value =>
  typeof value === 'string'
