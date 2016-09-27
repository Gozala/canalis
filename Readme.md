# canalis
[![travis][travis-image]][travis-url]
[![npm][npm-image]][npm-url]
[![downloads][downloads-image]][downloads-url]
[![js-standard-style][standard-image]][standard-url]

Library provides [CSP][] style channels implementation as a messaging layer for light weight processes / threads provided by [outtask][] library.

## Usage

All examples presume following bindings in scope:

```js
import Task from 'outtask'
import Channel from 'canalis'

const print = message => new Task((succeed, fail) => {
  console.log('Print', message)
  succeed()
})
```

In some cases library returns `Task<never, a>` where `never` is type parameter and it signifies that task can never fail. _This trick makes it so that type checker does not pose any restriction on task's error type that makes it easier to use._

### `Channel <message>`

Channel consists of `writer` / `reader` ports. All data written or writer end will become available on the `reader` end. Writing into buffered channel is synchronous until buffer is full, after that write tasks block until buffer gains more space due to read from the reader end. Size strategy is configured using buffer in use.

```js
const main = (channel:Channel<string>) => {
  // `reader` is the receiving half of transmission and `writer` is the
  // sending half of transmission.
  const {reader, writer} = channel

  // Fork a process that writes the message into the channel and then closes
  // it once transmission is complete.
  writer
    .write('Hello world')
    .chain(_ => writer.close())
    .fork(console.log, console.error)

  // Fork a process that prints out received message on the channel.
  reader
    .read()
    .chain(print)
    .fork(console.log, console.error)
}
```

Please note that for the `Channel<message>` instance also contains `read` `write`, `close` methods along with `reader` / `writer` ports for convenience in cases where `reader` and `writer` are the same entity.

### `Reader <message>`

`Reader<message>` is a receiving port of the `Channel<message>`.

#### Methods

##### `read() => Task<ReadError, message>`

Task attempts to wait for a `message` on this `reader`, succeeding with a `message` once it read or failing with `ReadError` if the corresponding channel has being closed.

This task will block if there is no data available on the channel. Once a `message` is written, this task will succeed with that `message`.

If the corresponding `Writer<message>` has closed the channel before or while this task is blocked, this task will fail with `ReadError` to indicate that no more messages can ever be read on this channel. However, since channels can be buffered, messages written prior to closing will still be successfully read.

```js
const main = ({reader, writer}:Channel<number>) => {
  writer
    .write(42)
    .fork(console.log, console.error)

  reader
    .read()
    .fork(console.log, console.error)

  // => Log: undefined
  // => Log: 42
}
```

Buffering behavior:

```js
const main = ({reader, writer}:Channel<number>) => {
  writer
    .write(42)
    .chain(_ => writer.write(43))
    .chain(_ => writer.close())
    .chain(_ => reader.read().chain(print))
    .chain(_ => reader.read().chain(print))
    .chain(_ => reader.read().chain(print))
    .fork(console.log, console.error)

  // Print: 42
  // Print: 43
  // Error: ReadError { name: 'ReadError' }
}
```

##### `close() => Task<never, void>`

Task closes the corresponding `Channel<message>`. Any writes to the corresponding `Channel<message>` will fail with `WriteError<message>`. If corresponding `Channel<message>` was buffered, messages written prior to closing will still be available for reading.


### `Writer <message>`

`Writer<message>` is a sending port of the `Channel<message>`.

#### Methods

##### `write(chunk:message) => Task<WriteError<message>, void>`

Task attempts to write `message` into corresponding `Channel<message>`.

A task succeeds with `void` unless corresponding `Channel<message>` has being closed already from either (`reader` or `writer`) side. A write would fail if
corresponding `Channel<message>` with a `WriteError<message>`. Note that write failure means that data will never be read on the other end, but success does not mean that data will be read. *Note that `WriteError<message>` contains message that failed under `.payload` field.*


```js
const main = ({reader, writer}:Channel<number>) => {
  writer
    .write(42)
    .fork(console.log, console.error)

  reader
    .read()
    .fork(console.log, console.error)

  // => Log: undefined
  // => Log: 42
}
```

Failing example:

```js
const main = ({reader, writer}:Channel<number>) => {
  writer
    .write(42)
    .chain(_ => reader.read().chain(print))
    .chain(_ => reader.close())
    .chain(_ => writer.write(43))
    .fork(console.log, console.error)

  // Print: 42
  // Error: WriteError { name: 'WriteError', payload: 42 }
}
```

##### `close() => Task<never, void>`

Task closes the corresponding `Channel<message>`. Any writes to the corresponding `Channel<message>` will fail with `WriteError<message>`. If corresponding `Channel<message>` was buffered, messages written prior to closing will still be available for reading.




### `<never, msg> open(buffer:?Buffer<msg>) => Task<never, Channel<msg>>`

Creating a `Channel<message>` is an effectfull operation and there for it is performed with tasks. If `open` is supplied no arguments "rendezvous" a.k.a synchronous channel is created. Such channels differ greatly in the semantics from buffered channels as they blocks write tasks until corresponding read task is performed and vice versa.

```js
Channel
  .open()
  .chain(channel => {
    const receive =
      _ =>
      channel
        .reader
        .read()
        .chain(print)
        .chain(receive)

    const send =
      _ =>
      channel
      .writer
      .write('Ping')
      .chain(send)

    const loop =
      receive()
      .spawn()
      .chain(send)

    return loop
  })
  .fork(console.log, console.error)
```

Buffer channels can be created by suppling an optional buffer argument which provides a means of configuration of coordination semantics between `Reader<message>` and `Writer<message>` ends.

```js
Channel
  .open(new FixedBuffer(12))
  .chain(channel => {
    // ...
  })
  .fork(console.log, console.error)
```

### `Buffer <message>`

Channels can be created with buffers that extend `Buffer<message>` base class. Subclasses must implement two methods of the `Buffer<message>` base class. All buffers are internally mutable objects and all the mutations are assumed to be done only by the single channel that was instantiated with it.

#### `write (chunk:message) => ?Buffer.WriteError`

If write is successful method must return `void` otherwise it must return instance of `Buffer.WriteError` indicating that buffer has no space available for given `chunk`.

#### `read => chunk|Buffer.ReadError`

If no data is available in the buffer it must return `Buffer.ReadError` instance otherwise it should return chunk that is considered read.

Library provides handful of the `Buffer` implementation that can be used to configure channels.

### `FixedBuffer(size:number)`

`FixedBuffer(n)` buffer can be used to create a channel that will allow `n` writes until writes start to block.

```js
Channel
  .open(new FixedBuffer(2))
  .chain({reader, writer}:Channel<number>) =>
    writer
      .write(42)
      .chain(_ => writer.write(43))
      .chain(_ => writer.close())
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
  .fork(console.log, console.error)

// Print: 42
// Print: 43
// Error: ReadError { name: 'ReadError' }
```

### `SlidingBuffer(size:number)`

`SlidingBuffer(n)` buffer can be used to create a channel that will never block but will start dropping oldest messages after `n` writes.

```js
Channel
  .open(new SlidingBuffer(2))
  .chain({reader, writer}:Channel<number>) =>
    writer
      .write(42)
      .chain(_ => writer.write(43))
      .chain(_ => writer.write(44))
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
  .fork(console.log, console.error)

// Print: 43
// Print: 44
// Error: ReadError { name: 'ReadError' }

```


### `DroppingBuffer(size:number)`

`DroppingBuffer(n)` buffer can be used to create a channel that will never block but will drop messages when buffer is full.

```js
Channel
  .open(new DroppingBuffer(2))
  .chain({reader, writer}:Channel<number>) =>
    writer
      .write(42)
      .chain(_ => writer.write(43))
      .chain(_ => writer.write(44))
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
      .chain(_ => reader.read().chain(print))
  .fork(console.log, console.error)

// Print: 42
// Print: 43
// Error: ReadError { name: 'ReadError' }
```


## Install

    npm install canalis

## Prior art

- [Channels][rust-channel] in [Rust][].
- [core.async][] from [Clojure][].
- [Channels][go-channels] in [Go][].

[standard-url]:http://standardjs.com/
[CSP]:https://en.wikipedia.org/wiki/Communicating_sequential_processes
[outtask]:https://github.com/Gozala/outtask
[Rust]:http://rust-lang.org
[rust-channel]:https://doc.rust-lang.org/std/sync/mpsc/fn.channel.html
[core.async]:http://clojure.github.io/core.async/
[Clojure]:http://clojure.org
[Go]:https://golang.org
[go-channels]:https://vimeo.com/49718712

[travis-image]: https://travis-ci.org/Gozala/canalis.svg?branch=master
[travis-url]: https://travis-ci.org/Gozala/canalis
[npm-image]: https://img.shields.io/npm/v/canalis.svg
[npm-url]: https://npmjs.org/package/canalis
[downloads-image]: https://img.shields.io/npm/dm/canalis.svg
[downloads-url]: https://npmjs.org/package/canalis
[standard-image]:https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]:http://standardjs.com/
