/* @flow */

import Buffer from '../Buffer'
import {ReadError, WriteError, Pipe} from './Core'

const readError = new ReadError()

export const enqueue = <message, _>
  (pipe:Pipe<message>):void => {
    if (!pipe.scheduled) {
      pipe.scheduled = true
      Promise.resolve(pipe).then(resume)
    }
  }

const resume = <message, _>
  (pipe:Pipe<message>) => {
    pipe.scheduled = false
    const {writeQueue, readQueue, closed, buffer} = pipe

    // count items in read & write queues at the begining of this routine as
    // more read / write operations can be queued in side effects and those
    // should be dealt with only in the next run.
    const readCount = readQueue.length
    const writeCount = writeQueue.length
    let readIndex = 0
    let writeIndex = 0

    // # Read block
    while (readIndex < readCount) {
      const pendingRead = readQueue[readIndex]
      // If pending read was aborted just drop it & continue with next one.
      if (pendingRead.aborted) {
        readIndex ++
        continue
      } else {
        // Otherwise attempt to read chunk from the buffer.
        const chunk = buffer.read()
        // If reading from buffer failed, then buffer is empty.
        if (chunk instanceof Buffer.ReadError) {
          // Given that buffer is empty (due to ReadError) if channel is closed
          // it is exhasted. In such case break the loop. Next block will fail
          // all the remaining writes and reads to this channel.
          if (closed) {
            break
          // If channel is not closed and there are some pending writes iterate
          // over them in order to complete pending read / write pair.
          } else if (writeIndex < writeCount) {
            while (writeIndex < writeCount) {
              const pendingWrite = writeQueue[writeIndex]
              // If pending write was aborted drop it & continue with next one.
              if (pendingWrite.aborted) {
                writeIndex++
                continue
              // Otherwise succeed pending write first & then correspondig
              // read and break the loop, to continue outer loop that walks
              // through pending reads. Write is completed first as it makes
              // more sense - Need to write message first in order to be able
              // to read it out.
              } else {
                writeIndex++
                readIndex++
                pendingWrite.succeed()
                pendingRead.succeed(pendingWrite.payload)
                break
              }
            }
            continue
          // If buffer is empty and there are no pending writes all remaining
          // (including current) pending reads will remain blocked until more
          // data becames available there for break the loop.
          } else {
            break
          }
        // If chunk was read from buffer then succeed pending read with it and
        // continue with next pending read.
        } else {
          readIndex ++
          pendingRead.succeed(chunk)
          continue
        }
      }
    }

    // # Close block
    // If channel is closed iterate through all pending writes and fail those.
    // Iterate throug all pending reads and fail those too. Note that there
    // only going to be pending reads left if buffer was exhasted & in that case
    // they do need to fail. If buffer was not exhasted then previous loop would
    // have exhasted all pending reads.
    if (closed) {
      while (writeIndex  < writeCount) {
        const pendingWrite = writeQueue[writeIndex]
        if (pendingWrite.aborted) {
          writeIndex ++
        } else {
          writeIndex ++
          pendingWrite.fail(new WriteError(pendingWrite.payload))
        }
      }

      while (readIndex < readCount) {
        const pendingRead = readQueue[readIndex]
        if (pendingRead.aborted) {
          readIndex ++
        } else {
          readIndex ++
          pendingRead.fail(readError)
        }
      }
    }

    // # Write block
    // If there are more pending writes left, which will only happen if channel
    // is not closed, there is a chance some reads were completed and there for
    // buffer got more space. In such case some pending writes could be
    // completed. Iterate throug pending writes and attempt to write data into
    // buffer. If write succeeds enqueue this routine again as buffer has more
    // data and some pending reads could be completed (although it may not
    // be necessary our read block should handle this case) otherwise break the
    // loop until more reads are performed freeing up a buffer.
    while (writeIndex < writeCount) {
      const pendingWrite = writeQueue[writeIndex]
      if (buffer.write(pendingWrite.payload) instanceof Buffer.WriteError) {
        break
      } else {
        writeIndex ++
        enqueue(pipe)
        continue
      }
    }

    // Finally remove pending read / writes from queue that were perfromed.
    readQueue.splice(0, readIndex)
    writeQueue.splice(0, writeIndex)
  }
