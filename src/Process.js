/* @flow */

import Task from 'outtask'
import Buffer from './Buffer'
import FixedBuffer from './FixedBuffer'
import Channel from './Channel'

const stepProgram =
  (config, enqueue, state, commands) => {
    config.render(document.body, enqueue, config.view(state))
    config.dispatchEffects(commands, config.subscriptions(state))
  }

const initProgram = <error, model>
  (config, enqueue):Task<error, model> =>
  new Task((succeed, fail) => {
    const [model, commands] = config.init()
    stepProgram(config, enqueue, model, commands)
    succeed(model)
  })

const updateProgram = <error, model>
  (config, enqueue, state, message):Task<error, model>  =>
  new Task((succeed, fail) => {
    const [model, commands] = config.update(state, message)
    stepProgram(config, enqueue, model, commands)
    succeed(model)
  })

const main = <value, message>
  (config):Task<Channel.ReadError, value> =>
  Channel
  .open()
  .chain(channel => {
    const enqueue =
      message =>
      channel.write(message)

    const step =
      state =>
      channel
        .read()
        .chain(message => updateProgram(config, enqueue, state, message))
        .chain(step)

    return initProgram(config, enqueue).chain(step)
  })



// const loop =
//   (config) => {
//   spawn(reader => {
//     const step =
//       state =>
//       read(reader)
//         .chain(message => update(state, message))
//         .chain(step)
//
//     return step(init())
//   }).chain(writer => {
//     return write(4, writer)
//   })
