/* @flow */

import Channel from '../'
import FixedBuffer from '../lib/FixedBuffer'
import SlidingBuffer from '../lib/SlidingBuffer'
import DroppingBuffer from '../lib/DroppingBuffer'
import Task from 'outtask'
import test from 'tape'

test('should return correct value that was directly put', test => {
  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => writer.write(42).spawn())
    .chain(_ => reader.read())
    .chain(chunk => {
      test.equal(chunk, 42, 'read wrote chunk')
      return reader.close()
    })
    .chain(_ => reader.read())

  Channel
    .open()
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError, 'read failed')))
})

test('should return correct value that was buffered', test => {
  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => writer.write(42))
    .chain(_ => writer.close())
    .chain(_ => reader.read())
    .chain(chunk => {
      test.equal(chunk, 42, 'read wrote chunk')
      return reader.read()
    })

  Channel
    .open(new FixedBuffer(1))
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError, 'read failed')))
})


test('should fail read if channel is already closed', test => {
  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => writer.close())
    .chain(_ => reader.read())

  Channel
    .open()
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError, 'read failed')))
})


test('read succeeds with chunk after written', test => {
  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => Task.sleep(5))
    .chain(_ => writer.write(42))
    .chain(_ => writer.close())
    .spawn()
    .chain(_ => reader.read())
    .chain(chunk => {
      test.equal(chunk, 42, 'Read written chunk')
      return reader.read()
    })

  Channel
    .open()
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError, 'read failed')))
})


test('read fails after channel is closed', test => {
  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => Task.sleep(5))
    .chain(_ => writer.close())
    .spawn()
    .chain(_ => reader.read())

  Channel
    .open()
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError, 'read failed')))
})
