import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

const config = await readFile(new URL('../js/config.js', import.meta.url), 'utf8');
const utils = await readFile(new URL('../js/utils.js', import.meta.url), 'utf8');

function durationContext() {
  const context = createContext({
    Date,
    console,
    getStaffShiftsInSession(session, userId) {
      return (session.shifts || []).filter(shift => shift.hostId === userId || shift.operatorId === userId || shift.userId === userId);
    }
  });
  runInContext(config, context);
  runInContext(utils, context);
  return context;
}

test('LIVE duration uses exact API timestamps and supports overnight slots', () => {
  const context = durationContext();
  assert.equal(context.sessionDurationMinutes({
    startedAt: '2026-10-28T12:31:00.000Z',
    endedAt: '2026-10-28T15:55:00.000Z',
    slot: '19:31 - 22:55'
  }), 204);
  assert.equal(context.slotDurationMinutes('21:00 - 01:30'), 270);
  assert.equal(context.formatLiveMinutes(270), '4 giờ 30 phút');
});

test('staff LIVE hours follow assigned shifts without exposing or depending on session ids', () => {
  const context = durationContext();
  const session = {
    id: 'internal-only',
    hasShifts: true,
    shifts: [
      { hostId: 'host', operatorId: 'operator', timeSlot: '08:00 - 10:30' },
      { hostId: 'host-2', operatorId: 'operator', timeSlot: '10:30 - 12:00' }
    ]
  };
  assert.equal(context.staffSessionMinutes(session, 'host'), 150);
  assert.equal(context.staffSessionMinutes(session, 'operator'), 240);
});
