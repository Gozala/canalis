/* @flow */

import SlidingBuffer from '../lib/SlidingBuffer'
import Task from 'outtask'
import test from 'tape'

test('dropping buffer', test => {
  const buffer = new SlidingBuffer(2)

  test.ok(buffer.read() instanceof SlidingBuffer.ReadError, 'Can not read from empty')

  test.ok(buffer.write('1') == null)

  test.equal(buffer.read(), '1', 'Read whatever was written')
  test.ok(buffer.read() instanceof SlidingBuffer.ReadError, 'Can not read from empty')

  test.ok(buffer.write('2') == null)
  test.ok(buffer.write('3') == null)
  test.ok(buffer.write('4') == null)
  test.ok(buffer.write('5') == null)

  test.equal(buffer.read(), '4', 'Reads out fourth chunk')
  test.equal(buffer.read(), '5', 'Reads out fifth chunk')

  test.ok(buffer.read() instanceof SlidingBuffer.ReadError, 'Can not read from empty')

  test.end()
})
