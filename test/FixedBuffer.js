/* @flow */

import FixedBuffer from '../lib/FixedBuffer'
import Task from 'outtask'
import test from 'tape'

test('fixed buffer', test => {
  const buffer = new FixedBuffer(2)

  test.ok(buffer.read() instanceof FixedBuffer.ReadError, 'Can not read from empty')
  test.ok(buffer.write('1') == null)

  test.equal(buffer.read(), '1', 'Read whatever was written')
  test.ok(buffer.read() instanceof FixedBuffer.ReadError, 'Can not read from empty')

  test.ok(buffer.write('2') == null)
  test.ok(buffer.write('3') == null)

  test.ok(buffer.write('4') instanceof FixedBuffer.WriteError, 'buffer is full')

  test.equal(buffer.read(), '2', 'Reads out first chunk')
  test.equal(buffer.read(), '3', 'Reads out second chunk')

  test.ok(buffer.read() instanceof FixedBuffer.ReadError, 'Can not read from empty')

  test.end()
})
