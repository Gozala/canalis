/* @flow */

import Channel from '../'
import FixedBuffer from '../lib/FixedBuffer'
import SlidingBuffer from '../lib/SlidingBuffer'
import DroppingBuffer from '../lib/DroppingBuffer'
import Task from 'outtask'
import test from './Test'
import tape from 'tape'

test('write succeeds with void when read', Channel.open(), (channel, test) => {
  channel
    .reader
    .read()
    .fork(a => test.equal(a, 42, 'read 42'),
          x => test.fail('Read should not fail', x))

  channel
    .writer
    .write(42)
    .fork(a => test.end(test.ok(a == null, 'wrote 42')),
          x => test.end(test.fail('Write failed', x)))
})

test('succeed if buffered', Channel.open(new FixedBuffer(1)), (channel, test) => {
  channel
    .writer
    .write(42)
    .fork(a => test.end(test.ok(a == null, 'wrote 42')),
          x => test.end(test.fail('Write failed', x)))
})

test('fail if closed', Channel.open(), (channel, test) => {
  channel
    .writer
    .close()
    .chain(_ => channel.writer.write(42))
    .fork(a => test.end(test.fail('Write shoulf fail')),
          x => test.end(test.ok(x instanceof Channel.WriteError)))
})


test('write succeeds with void after read', Channel.open(), (channel, test) => {
  Task
  .sleep(5)
  .chain(_ => channel.reader.read())
  .fork(a => test.equal(a, 42, 'read 42'),
        x => test.fail('Read should not fail', x))

  channel
    .writer
    .write(42)
    .fork(a => test.end(test.ok(a == null, 'wrote 42')),
          x => test.end(test.fail('Write failed', x)))
})

test('fail after closed', Channel.open(), (channel, test) => {
  Task
  .sleep(5)
  .chain(_ => channel.close())
  .fork(a => test.ok(a == null, 'close succeeds with void'),
        x => test.fail('close failed', x))

  channel
    .writer
    .write(42)
    .fork(a => test.end(test.fail('Write shoulf fail')),
          x => test.end(test.ok(x instanceof Channel.WriteError)))
})

tape('queued chunk is moves to buffer', test => {
  const buffer = new FixedBuffer(2)

  const onChannel =
    ({reader, writer}) =>
      (Task.succeed(''):Task<any, string>)
      .chain(_ => writer.write('42'))
      .chain(_ => {
        test.deepEqual(buffer.chunks, ['42'])
        return writer.write('43')
      })
      .chain(_ => {
        test.deepEqual(buffer.chunks, ['43', '42'])
        return writer.write('44').spawn()
      })
      .chain(_ => {
        test.deepEqual(buffer.chunks, ['43', '42'])
        return reader.read()
      })
      .chain(chunk => {
        test.equal(chunk, '42')
        // TODO: Pending operations are processed in the followup tick.
        // which is why pendig write isn't going to make it into buffer
        // yet. Which seems counter intuitive.
        return Task.sleep(0)
      })
      .chain(_ => {
        test.deepEqual(buffer.chunks, ['44', '43'])
        return writer.close()
      })
      .chain(_ => reader.read())
      .chain(chunk => {
        test.equal(chunk, '43')
        test.deepEqual(buffer.chunks, ['44'])
        return reader.read()
      })
      .chain(chunk => {
        test.equal(chunk, '44')
        test.deepEqual(buffer.chunks, [])
        return reader.read()
      })

  Channel
    .open(buffer)
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should have failed')),
          x => test.end(test.ok(x instanceof Channel.ReadError)))
})

tape('write into sliding buffer', test => {
  const buffer = new SlidingBuffer(2)

  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => writer.write(42))
    .chain(_ => writer.write(43))
    .chain(_ => writer.write(44))
    .chain(_ => writer.close())
    .chain(_ => reader.read())
    .chain(chunk => {
      test.equal(chunk, 43, 'read second chunk')
      return reader.read()
    })
    .chain(chunk => {
      test.equal(chunk, 44, 'read third chunk')
      return reader.read()
    })

  Channel
    .open(buffer)
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError)))
})

tape('write into dropping buffer', test => {
  const buffer = new DroppingBuffer(2)

  const onChannel =
    ({reader, writer}) =>
    (Task.succeed(0):Task<any, number>)
    .chain(_ => writer.write(42))
    .chain(_ => writer.write(43))
    .chain(_ => writer.write(44))
    .chain(_ => writer.close())
    .chain(_ => reader.read())
    .chain(chunk => {
      test.equal(chunk, 42, 'read first chunk')
      return reader.read()
    })
    .chain(chunk => {
      test.equal(chunk, 43, 'read second chunk')
      return reader.read()
    })

  Channel
    .open(buffer)
    .chain(onChannel)
    .fork(a => test.end(test.fail('Should fail')),
          x => test.end(test.ok(x instanceof Channel.ReadError)))
})
