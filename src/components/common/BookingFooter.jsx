import { PawPrint, Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react'

export default function BookingFooter({ general, footer, primary }) {
  const business = general || {}
  const contact = footer || {}
  const phone = String(contact.phone || '').trim()
  const email = String(contact.email || '').trim()
  const address = String(contact.address || '').trim()
  const facebook = String(contact.facebook || '').trim()

  return (
    <footer className="booking-footer @container relative overflow-hidden text-white" style={{ background: primary }}>
      <PawPrint aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-6 w-40 h-40 rotate-[-20deg] opacity-10" />
      <div className="booking-footer-inner relative max-w-6xl mx-auto px-6 py-10 @md:px-10">
        <div className="grid gap-8 @md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] @md:gap-16">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {business.logo
                ? <img src={business.logo} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/10" />
                : <span className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><PawPrint size={25} aria-hidden="true" /></span>}
              <p className="font-bold text-xl break-words">{business.businessName || 'Pet Care'}</p>
            </div>
            {business.tagline && <p className="mt-4 text-sm leading-relaxed text-white/90 max-w-sm">{business.tagline}</p>}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3">Get in touch</h2>
            <div className="grid gap-x-8 gap-y-1 text-sm text-white @md:grid-cols-2">
              {phone && <a href={`tel:${phone}`} className="flex items-center gap-3 min-h-11 hover:underline underline-offset-4"><Phone size={17} className="shrink-0" aria-hidden="true" /><span className="break-all">{phone}</span></a>}
              {email && <a href={`mailto:${email}`} className="flex items-center gap-3 min-h-11 hover:underline underline-offset-4"><Mail size={17} className="shrink-0" aria-hidden="true" /><span className="break-all">{email}</span></a>}
              {address && <p className="flex items-start gap-3 py-3"><MapPin size={17} className="shrink-0 mt-0.5" aria-hidden="true" /><span className="break-words">{address}</span></p>}
              {facebook && <a href={facebook.startsWith('http') ? facebook : `https://${facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 underline underline-offset-4">Visit our Facebook page <ArrowUpRight size={16} aria-hidden="true" /></a>}
              {!phone && !email && !address && !facebook && <p className="text-white/90 leading-relaxed @md:col-span-2">Add your phone, email, or address in Footer settings.</p>}
            </div>
          </div>
        </div>
        <div className="border-t border-white/25 mt-8 pt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/90">
          <p>© {new Date().getFullYear()} Appointeefy. All rights reserved.</p>
          <span className="inline-flex items-center gap-2"><PawPrint size={15} aria-hidden="true" /> Pet sitting, simply scheduled.</span>
        </div>
      </div>
    </footer>
  )
}
