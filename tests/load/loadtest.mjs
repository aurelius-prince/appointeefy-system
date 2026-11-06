// Load test for the STAGING Supabase project only. Simulates visitors loading /book/loadtest and sometimes booking.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('./staging.env', import.meta.url), 'utf8').trim().split('\n').map(l => l.split(/=(.*)/s).slice(0, 2)))
const BASE = env.STAGING_URL, KEY = env.STAGING_KEY
if (!BASE.includes('gjdkmfojygbsmmkjegfa')) { console.error('Refusing to run: not the staging project'); process.exit(1) }
const H = { apikey: KEY, 'content-type': 'application/json' }
const get = async (path) => { const t = performance.now(); try { const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H }); await r.arrayBuffer(); return { ms: performance.now() - t, status: r.status } } catch (e) { return { ms: performance.now() - t, status: 0 } } }
const acc = await (await fetch(`${BASE}/rest/v1/accounts?select=id&slug=eq.loadtest`, { headers: H })).json()
const ACC = acc[0].id
let seq = 0
const book = async () => { const t = performance.now(); const n = ++seq; try { const r = await fetch(`${BASE}/rest/v1/appointments`, { method: 'POST', headers: { ...H, prefer: 'return=minimal' }, body: JSON.stringify({ account_id: ACC, txn_code: `LT-${Date.now().toString(36)}-${n}-${Math.random().toString(36).slice(2, 6)}`, customer_name: 'LOADTEST visitor', customer_phone: '09000000000', check_in: '2027-03-01', check_out: '2027-03-02', date: '2027-03-01', status: 'pending', pricing_type: 'per_day', final_price: 1000, base_price: 1000 }) }); await r.arrayBuffer(); return { ms: performance.now() - t, status: r.status } } catch { return { ms: performance.now() - t, status: 0 } } }
const visit = async () => { const rs = await Promise.all([get('accounts?select=id&slug=eq.loadtest'), get(`services?select=*&account_id=eq.${ACC}`), get(`provider_pet_types?select=name&account_id=eq.${ACC}`), get(`appointments?select=check_in,check_out,time,end_time,status,pricing_type&account_id=eq.${ACC}&status=in.(pending,approved,confirmed,awaiting payment,paid)`), get(`booking_page_settings?select=settings&account_id=eq.${ACC}`)]); if (Math.random() < 0.15) rs.push(await book()); return rs }
const pct = (a, p) => a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))]) : 0
const levels = (process.argv[2] || '10,25,50,100,200').split(',').map(Number), secs = Number(process.argv[3] || 12)
console.log('visitors | requests | req/s | p50 ms | p95 ms | p99 ms | errors | status codes')
for (const vus of levels) {
  const end = Date.now() + secs * 1000, all = []
  await Promise.all(Array.from({ length: vus }, async () => { while (Date.now() < end) { all.push(...await visit()); await new Promise(r => setTimeout(r, Math.random() * 400)) } }))
  const ms = all.map(r => r.ms).sort((a, b) => a - b), codes = {}; all.forEach(r => codes[r.status] = (codes[r.status] || 0) + 1)
  const bad = all.filter(r => r.status < 200 || r.status >= 300).length
  console.log(`${String(vus).padStart(8)} | ${String(all.length).padStart(8)} | ${String(Math.round(all.length / secs)).padStart(5)} | ${String(pct(ms, .5)).padStart(6)} | ${String(pct(ms, .95)).padStart(6)} | ${String(pct(ms, .99)).padStart(6)} | ${((bad / all.length) * 100).toFixed(1).padStart(5)}% | ${JSON.stringify(codes)}`)
  if (bad / all.length > 0.2 || pct(ms, .95) > 8000) { console.log('STOP: error rate above 20% or p95 above 8s, not raising load further'); break }
  await new Promise(r => setTimeout(r, 5000))
}
