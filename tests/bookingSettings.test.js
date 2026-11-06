import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS, normalizeSettings, deepMerge, normalizeBlockedDates, slugify, isDateBlocked,
  readLegacySettings, legacyBelongsToAccount, fetchSettingsByAccount, saveSettings,
} from '../src/lib/bookingSettings.js'

// Minimal in-memory Supabase fake: records upserts and serves them back (simulates a different browser/device).
const fakeSupabase = (initial = null) => {
  let row = initial
  const calls = []
  return {
    calls,
    from: (table) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      upsert: async (payload, opts) => { calls.push({ table, payload, opts }); row = { settings: payload.settings }; return { error: null } },
    }),
  }
}

test('normalizeSettings(null) yields complete defaults', () => {
  const s = normalizeSettings(null)
  assert.equal(s.general.businessName, 'Pet Care')
  assert.equal(s.hours.Sunday, false)
  assert.deepEqual(s.blockedDates, [])
  assert.equal(s.booking.fields.email.required, false)
})
test('normalizeSettings fills keys missing from old saved data', () => {
  const s = normalizeSettings({ booking: { title: 'Reserve' }, hours: { Sunday: true } })
  assert.equal(s.booking.title, 'Reserve')
  assert.ok(s.booking.fields.name.required)
  assert.equal(s.hours.Sunday, true)
  assert.equal(s.hours.Monday, true)
})
test('normalizeSettings tolerates garbage', () => {
  for (const bad of [undefined, 5, 'x', [], { hours: 'oops', blockedDates: 'no', general: { businessName: '  ' } }]) {
    const s = normalizeSettings(bad)
    assert.equal(s.general.businessName, 'Pet Care')
    assert.deepEqual(s.blockedDates, [])
    assert.equal(s.hours.Monday, true)
  }
})
test('normalizeSettings does not mutate DEFAULT_SETTINGS', () => {
  const s = normalizeSettings({ general: { businessName: 'X' }, hours: { Monday: false } })
  s.hero.images.push('a')
  assert.equal(DEFAULT_SETTINGS.general.businessName, 'Pet Care')
  assert.equal(DEFAULT_SETTINGS.hours.Monday, true)
  assert.deepEqual(DEFAULT_SETTINGS.hero.images, [])
})
test('deepMerge replaces arrays instead of concatenating', () => {
  assert.deepEqual(deepMerge({ a: [1, 2], b: { c: 1 } }, { a: [3], b: { d: 2 } }), { a: [3], b: { c: 1, d: 2 } })
})
test('blocked dates: dedupe, validate, sort', () => {
  const out = normalizeBlockedDates([
    { date: '2026-12-25', reason: 'Xmas' }, { date: '2026-12-25' }, { date: 'bad' }, { date: '2026-02-30x' }, null, { date: '2026-11-01' },
  ])
  assert.deepEqual(out.map(b => b.date), ['2026-11-01', '2026-12-25'])
  assert.ok(isDateBlocked({ blockedDates: out }, '2026-12-25'))
  assert.ok(!isDateBlocked({ blockedDates: out }, '2026-12-26'))
})
test('slugify matches onboarding rules', () => {
  assert.equal(slugify("Petsi's  Pet Care!"), 'petsis-pet-care')
  assert.equal(slugify('  --Hello--  '), 'hello')
  assert.equal(slugify(''), '')
})
test('readLegacySettings migrates old localStorage and skips corrupt entries', () => {
  const store = { bp_general: JSON.stringify({ businessName: 'Old' }), bp_hours: '{bad json', bp_allow_overlap: 'true' }
  const out = readLegacySettings({ getItem: (k) => (k in store ? store[k] : null) })
  assert.deepEqual(out.general, { businessName: 'Old' })
  assert.equal(out.allowOverlap, true)
  assert.ok(!('hours' in out))
})

test('legacyBelongsToAccount only accepts the signed-in account\'s own old settings', () => {
  assert.ok(legacyBelongsToAccount({ general: { businessName: 'Petsi' } }, { name: 'Petsi', slug: 'petsi' }))
  assert.ok(legacyBelongsToAccount({ general: { businessName: ' petsi ' } }, { name: 'PETSI', slug: 'x' }))
  assert.ok(legacyBelongsToAccount({ general: { businessName: "Kysha's Pet Sunctuary" } }, { name: 'Other', slug: 'kyshas-pet-sunctuary' }))
  assert.ok(!legacyBelongsToAccount({ general: { businessName: "Juan's Pet Care" } }, { name: 'Petsi', slug: 'petsi' }))
  assert.ok(!legacyBelongsToAccount({ hours: { Monday: true } }, { name: 'Petsi', slug: 'petsi' }))
  assert.ok(!legacyBelongsToAccount({ general: { businessName: 'Petsi' } }, null))
})

test('saveSettings writes to the DB and another device reads the same data (the original bug)', async () => {
  const db = fakeSupabase()
  const edited = { ...normalizeSettings(null), general: { ...DEFAULT_SETTINGS.general, businessName: 'Petsi' }, blockedDates: [{ date: '2026-12-25', reason: 'Xmas' }], allowOverlap: true }
  await saveSettings(db, 'acc-1', edited)
  assert.equal(db.calls[0].table, 'booking_page_settings')
  assert.equal(db.calls[0].payload.account_id, 'acc-1')
  assert.equal(db.calls[0].opts.onConflict, 'account_id')
  const seenByCustomer = await fetchSettingsByAccount(db, 'acc-1')
  assert.equal(seenByCustomer.general.businessName, 'Petsi')
  assert.equal(seenByCustomer.allowOverlap, true)
  assert.equal(seenByCustomer.blockedDates[0].date, '2026-12-25')
})
test('saveSettings requires an account and surfaces DB errors', async () => {
  await assert.rejects(() => saveSettings(fakeSupabase(), null, {}), /No account/)
  const failing = { from: () => ({ upsert: async () => ({ error: new Error('RLS denied') }) }) }
  await assert.rejects(() => saveSettings(failing, 'acc', {}), /RLS denied/)
})
test('fetchSettingsByAccount returns null when nothing saved yet', async () => {
  assert.equal(await fetchSettingsByAccount(fakeSupabase(null), 'acc'), null)
})
