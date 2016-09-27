/* @flow */

import Task from 'outtask'
import tape from 'tape'

export const test = <x, a>
  (description:string, task:Task<x, a>, body:(input:a, test:tape) => void) =>
  tape(description,
        (test:tape) =>
        task.fork(channel => body(channel, test),
                  x => test.fail('open failed', x)))

export default test
