import test from 'node:test'
import assert from 'node:assert/strict'
import { mapRow } from '../src/lib/appointmentMapper.js'

const row = (o = {}) => ({
  id: 1, account_id: 'a', customer_name: 'Test', customer_phone: '0917', notes: 'Address: 1 Test St\nGate code 1',
  check_in: '2026-11-10', check_out: '2026-11-12', pricing_type: 'per_day', duration: 72, base_price: 1500, final_price: 1500,
  service_name: 'Pet Sitting', status: 'pending', ...o,
})

test('mapRow extracts address from notes and defaults safely', () => {
  const m = mapRow(row())
  assert.equal(m.address, '1 Test St')
  assert.equal(m.status, 'pending')
  assert.deepEqual(m.payments, [])
  const empty = mapRow({ id: 2 })
  assert.equal(empty.customer, ''); assert.equal(empty.status, 'pending'); assert.equal(empty.pricingType, 'per_day')
})
test('mapRow normalises daily pricing aliases', () => {
  for (const t of ['daily', 'per day', 'DAY', 'per_day']) assert.equal(mapRow(row({ pricing_type: t })).pricingType, 'per_day')
  assert.equal(mapRow(row({ pricing_type: 'per_hour', service_name: 'Visit' })).pricingType, 'per_hour')
})
test('mapRow keeps correct stored totals unchanged', () => {
  const m = mapRow(row())
  assert.equal(m.finalPrice, 1500); assert.equal(m.basePrice, 1500)
})
test('mapRow does not rescale per-hour prices', () => {
  const m = mapRow(row({ pricing_type: 'per_hour', service_name: 'Visit', duration: 3, base_price: 300, final_price: 300, check_in: '2026-11-10', check_out: '2026-11-10' }))
  assert.equal(m.finalPrice, 300)
})
