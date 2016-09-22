/* @flow */

import Channel from '../'
import Task from 'outtask'
import test from 'tape'

const infer = <x, a>
  (task:Task<x, a>,
  onSucceed:(value:a) => void,
  onFail:(error:x) => void
  ):Task<null, null> =>
  task
  .chain((value:a) => {
    onSucceed(value)
    return Task.succeed(null)
  }).capture((error:x) => {
    onFail(error)
    return Task.fail(null)
  })

test('test read / write', test => {
  const onReadSucceed =
    value => {
      test.deepEqual(value, [1, 2, 3], 'received messages')
      return Task.succeed()
    }

  const onReadFail =
    value => {
      test.fail('Read should not have failed')
      return Task.succeed()
    }

  const onFail =
    value => {
      test.fail('should not have failed')
      test.end()
    }

  const onSucceed =
    value => {
      test.equal(value, undefined, 'Succed with void')
      test.end()
    }

  Channel
    .open()
    .chain(channel => {
      const step =
        state =>
        state.length === 3
        ? Task.succeed(state)
        : loop(state)

      const loop =
        state =>
        channel
        .read()
        .chain(message => onMessage(state, message))
        .chain(step)

      const onMessage =
        (state, message) =>
        Task.succeed([...state, message])

      const task =
        loop([])
        .capture(onReadFail)
        .chain(onReadSucceed)
        .spawn()
        .chain(_ => channel.write(1))
        .chain(_ => channel.write(2))
        .chain(_ => channel.write(3))

      return task
    })
    .fork(onSucceed, onFail)
})

test('test write -> close -> read', test => {
  const log = []
  const push =
    message => {
      log.push(message)
      if (log.length === 6) {
        onEnd()
      }
    }


  const onReadSucceed =
    value =>
    push({ read: {ok: value} })

  const onReadFail =
    value =>
    push({ read: {error: {name: value.name} } })

  const onWriteFail = <message>
    (value:Channel.WriteError<message>) =>
    push({ write: {error: {name: value.name, payload: value.payload} }})

  const onWriteSucceed =
    value =>
    push({ write: {ok: value}})

  const onCloseSucceed =
    value =>
    push({ close: {ok: value }})

  const onCloseFail =
    value =>
    push({ close: {error: value }})

  const onSucceed =
    value =>
    push({ exit: {ok: value}})

  const onFail =
    value =>
    push({ exit: {error: value}})

  const onEnd =
    () => {
      test.deepEqual(log, [
        { write: {ok: undefined} },
        { close: {ok: undefined} },
        { exit: {ok: null}},
        { read: {ok: {message: 'Hi'}} },
        { read: {error: {name: 'ReadError'}} },
        { write: {error: {name: 'WriteError', payload: {message: 'Bye'}} }},
      ])
      test.end()
    }


  Channel
    .open()
    .chain(channel =>
      Task.sequence([
        infer(channel.read(), onReadSucceed, onReadFail).spawn().map(_ => null),
        infer(channel.read(), onReadSucceed, onReadFail).spawn().map(_ => null),
        infer(channel.write({message: 'Hi'}), onWriteSucceed, onWriteFail).map(_ => null),
        infer(channel.close(), onCloseSucceed, onCloseFail).map(_ => null),
        infer(channel.write({message: 'Bye'}), onWriteSucceed, onWriteFail).spawn().map(_ => null),
      ])
    )
    .map(_ => null)
    .fork(onSucceed, onFail)

})
