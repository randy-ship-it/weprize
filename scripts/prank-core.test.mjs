import assert from 'node:assert/strict'
import { classify, nextMove, speakNumber, caMobile, OPT_IN_SMS, smsSegments, prankCallUsd, PRANK_WORST_USD, PRANKS } from '../server/prank-core.js'
assert.equal(speakNumber('+14165550123'), 'four one six, five five five, zero one two three')
assert.ok(caMobile('+16479316278')); assert.ok(!caMobile('+12125550123')); assert.ok(!caMobile('+18675550123'))
for (const [s, k] of [['please stop', 'stop'], ['stop calling me', 'stop'], ['are you a robot', 'ai'], ['is this AI', 'ai'], ['who sent this', 'who'], ["who's this", 'who'], ["I didn't order a llama", 'didnt'], ['no', 'didnt'], ['yeah sure bring him over', 'play'], ['', 'silence'], ['hmm', 'silence']]) assert.equal(classify(s), k, s)
assert.deepEqual(nextMove({ said: 'stop' }), { kind: 'stop' })
assert.equal(nextMove({ said: 'are you a bot' }).ai, true)
assert.deepEqual(nextMove({ said: 'yes', used: ['play'], n: 2 }), { kind: 'line', line: 'who' })
assert.equal(nextMove({ said: 'yes', n: 3 }).kind, 'reveal')
assert.equal(nextMove({ said: 'yes', n: 1, elapsedSec: 40 }).kind, 'reveal')
assert.ok(/recorded and shared/.test(OPT_IN_SMS) && /YES/.test(OPT_IN_SMS) && !/https?:|\.net|\.com/.test(OPT_IN_SMS))
assert.equal(smsSegments(OPT_IN_SMS), 2)
for (const p of Object.values(PRANKS)) { const all = [p.opener('x'), p.didnt, p.who, p.play, p.silence, p.reveal].join(' '); assert.ok(!/\b(AI|police|hospital|debt|emergency|arrest)\b/i.test(all)) }
assert.ok(prankCallUsd(60) < 0.1); assert.ok(PRANK_WORST_USD < 0.2)
console.log('prank-core ok', { worst: PRANK_WORST_USD, typical: prankCallUsd(55) })
