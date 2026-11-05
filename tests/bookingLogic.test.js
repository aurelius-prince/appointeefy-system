import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inclusiveDays, totalHoursBetween, calcTotalPrice, closedDaysInRange, hasConfirmedOverlap,
  validateDateRange, validateCustomer, receiptPrefix, receiptNumber, isPerDay, toDateStr,
} from '../src/lib/bookingLogic.js'
import { DEFAULT_HOURS } from '../src/lib/bookingSettings.js'

const settings = (over = {}) => ({ hours: DEFAULT_HOURS, allowOverlap: false, blockedDates: [], ...over })
const base = { startTime: '10:00', endTime: '10:00', todayStr: '2026-11-05', bookings: [] }

test('inclusiveDays counts both ends', () => {
  assert.equal(inclusiveDays('2026-10-28', '2026-10-29'), 2)
  assert.equal(inclusiveDays('2026-10-28', '2026-10-28'), 1)
  assert.equal(inclusiveDays(null, '2026-10-28'), 0)
})
test('inclusiveDays across month and DST boundaries', () => {
  assert.equal(inclusiveDays('2026-10-30', '2026-11-02'), 4)
  assert.equal(inclusiveDays('2026-03-07', '2026-03-09'), 3)
})
test('totalHoursBetween rounds up and has 1h minimum', () => {
  assert.equal(totalHoursBetween('2026-11-10', '2026-11-10', '10:00', '12:30'), 3)
  assert.equal(totalHoursBetween('2026-11-10', '2026-11-10', '10:00', '10:00'), 1)
  assert.equal(totalHoursBetween('2026-11-10', '2026-11-11', '10:00', '10:00'), 24)
})
test('isPerDay / toDateStr', () => {
  assert.ok(isPerDay('per_day')); assert.ok(isPerDay('Daily')); assert.ok(!isPerDay('per_hour'))
  assert.equal(toDateStr(new Date(2026, 0, 5)), '2026-01-05')
})

const services = [
  { id: 'a', pricingType: 'per_day', price: 500, duration: 1 },
  { id: 'b', pricingType: 'per_hour', price: 100, duration: 2 },
]
test('calcTotalPrice per-day multiplies by inclusive days', () => {
  assert.equal(calcTotalPrice({ services, selected: [{ serviceId: 'a', count: 2 }], days: 3, hours: 72 }), 1500)
})
test('calcTotalPrice per-hour charges per duration block', () => {
  assert.equal(calcTotalPrice({ services, selected: [{ serviceId: 'b', count: 1 }], days: 1, hours: 5 }), 300)
})
test('calcTotalPrice counts a service once even with several pet types, ignores count 0 and unknown ids', () => {
  const selected = [{ serviceId: 'a', count: 1 }, { serviceId: 'a', count: 2 }, { serviceId: 'b', count: 0 }, { serviceId: 'zzz', count: 1 }]
  assert.equal(calcTotalPrice({ services, selected, days: 2, hours: 48 }), 1000)
})

test('closedDaysInRange finds Sundays', () => {
  assert.deepEqual(closedDaysInRange(DEFAULT_HOURS, '2026-11-06', '2026-11-09'), ['Sunday']) // Fri..Mon
  assert.deepEqual(closedDaysInRange(DEFAULT_HOURS, '2026-11-09', '2026-11-10'), [])
})

const bk = (o) => ({ check_in: '2026-11-10', check_out: '2026-11-12', time: '10:00', end_time: '10:00', status: 'approved', ...o })
test('overlap: day-level blocks any shared day', () => {
  const args = { bookings: [bk()], startTime: '10:00', endTime: '10:00', allowOverlap: false }
  assert.ok(hasConfirmedOverlap({ ...args, start: '2026-11-12', end: '2026-11-14' }))
  assert.ok(!hasConfirmedOverlap({ ...args, start: '2026-11-13', end: '2026-11-14' }))
})
test('overlap: pending, cancelled and completed bookings do not block', () => {
  for (const status of ['pending', 'cancelled', 'completed'])
    assert.ok(!hasConfirmedOverlap({ bookings: [bk({ status })], start: '2026-11-10', end: '2026-11-12', startTime: '10:00', endTime: '10:00', allowOverlap: false }))
})
test('overlap: back-to-back allowed when check-in time >= existing check-out time', () => {
  const args = { bookings: [bk()], endTime: '10:00', allowOverlap: true }
  assert.ok(!hasConfirmedOverlap({ ...args, start: '2026-11-12', end: '2026-11-14', startTime: '10:00' }))
  assert.ok(hasConfirmedOverlap({ ...args, start: '2026-11-12', end: '2026-11-14', startTime: '09:00' }))
})

test('validateDateRange: missing, reversed, past dates', () => {
  assert.match(validateDateRange({ ...base, start: null, end: null, settings: settings() }), /Choose both/)
  assert.match(validateDateRange({ ...base, start: '2026-11-12', end: '2026-11-10', settings: settings() }), /before check-in/)
  assert.match(validateDateRange({ ...base, start: '2026-11-05', end: '2026-11-06', settings: settings() }), /future/)
})
test('validateDateRange: closed day, blocked date, overlap, same-day time', () => {
  assert.match(validateDateRange({ ...base, start: '2026-11-07', end: '2026-11-09', settings: settings() }), /closed day \(Sunday\)/)
  assert.match(validateDateRange({ ...base, start: '2026-11-10', end: '2026-11-12', settings: settings({ blockedDates: [{ date: '2026-11-11' }] }) }), /unavailable date/)
  assert.match(validateDateRange({ ...base, start: '2026-11-11', end: '2026-11-11', bookings: [bk()], settings: settings() }), /overlap/)
  assert.match(validateDateRange({ ...base, start: '2026-11-10', end: '2026-11-10', startTime: '12:00', endTime: '10:00', settings: settings() }), /later than check-in/)
  assert.equal(validateDateRange({ ...base, start: '2026-11-10', end: '2026-11-11', settings: settings() }), '')
})

const form = { name: 'Test User', contact: '09171234567', email: '', address: '1 Test St', facebook: '', notes: '' }
test('validateCustomer: valid, required fields, formats', () => {
  assert.deepEqual(validateCustomer(form, {}, 1), {})
  const e = validateCustomer({ ...form, name: ' ', contact: 'abc', address: '', email: 'nope' }, {}, 0)
  assert.deepEqual(Object.keys(e).sort(), ['address', 'contact', 'email', 'name', 'services'])
})
test('validateCustomer honours required optional fields from settings', () => {
  const e = validateCustomer(form, { email: { required: true }, facebook: { required: true }, notes: { required: true } }, 1)
  assert.deepEqual(Object.keys(e).sort(), ['email', 'facebook', 'notes'])
})

test('receipt numbers are stable, well-formed, and safe on odd names', () => {
  assert.equal(receiptPrefix('Petsi Care'), 'PCX') // 2 initials are padded to 3 chars
  assert.match(receiptNumber('Petsi Care', 'acc-1', 'TXN-1'), /^PCX-[A-Z0-9]{2}-\d{5}$/)
  assert.equal(receiptNumber('Petsi Care', 'acc-1', 'TXN-1'), receiptNumber('Petsi Care', 'acc-1', 'TXN-1'))
  assert.match(receiptNumber('', null, null), /^[A-Z0-9]{3,4}-[A-Z0-9]{2}-\d{5}$/)
  assert.match(receiptNumber('!!!', 'a', 'b'), /^[A-Z0-9]{3,4}-/)
})
