/* @flow */

import DroppingBuffer from '../lib/DroppingBuffer'
import Task from 'outtask'
import test from 'tape'

test('dropping buffer', test => {
  const buffer = new DroppingBuffer(2)

  test.ok(buffer.read() instanceof DroppingBuffer.ReadError, 'Can not read from empty')

  test.ok(buffer.write('1') == null)

  test.equal(buffer.read(), '1', 'Read whatever was written')
  test.ok(buffer.read() instanceof DroppingBuffer.ReadError, 'Can not read from empty')

  test.ok(buffer.write('2') == null)
  test.ok(buffer.write('3') == null)
  test.ok(buffer.write('4') == null)
  test.ok(buffer.write('5') == null)

  test.equal(buffer.read(), '2', 'Reads out first chunk')
  test.equal(buffer.read(), '3', 'Reads out second chunk')

  test.ok(buffer.read() instanceof DroppingBuffer.ReadError, 'Can not read from empty')

  test.end()
})
