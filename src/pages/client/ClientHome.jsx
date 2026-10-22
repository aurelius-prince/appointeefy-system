import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, Globe2, Users } from 'lucide-react'
import { usePlans } from '../../hooks/usePlans'
import { useAuth } from '../../context/AuthContext'

const serviceTypes = [
  ['Pet Care Services', true], ['Real Estate Services', false], ['Fitness & Coaching', false],
  ['Beauty & Personal Care', false], ['Photography Services', false], ['Tutoring & Education', false],
  ['Health & Wellness', false], ['Home & Maintenance Services', false],
]

const features = [
  { icon: Globe2, title: 'Landing page website for your business', copy: 'Share a page with your business name in the link. Clients can see your service, choose a date, and send a booking request.' },
  { icon: CalendarDays, title: 'Appointments in one calendar', copy: 'Review requests, check your schedule, and follow each appointment from pending to completed.' },
  { icon: Users, title: 'Customer details together', copy: 'Keep contact details, pet information, and appointment history within your workspace.' },
  { icon: BarChart3, title: 'Clear records and insights', copy: 'Record appointment payments and see booking activity and business reports. Appointeefy does not collect client payments for you.' },
]

const formatMoney = value => `₱${Number(value || 0).toLocaleString('en-PH')}`

function PriceCard({ name, price, period, regular, saving, details, highlight }) {
  return (
    <article className={`landing-price-card ${highlight ? 'is-featured' : ''}`}>
      <div className="landing-price-head"><h3>{name}</h3>{highlight && <span>Popular</span>}</div>
      <p className={`landing-price-regular ${regular ? '' : 'no-strike'}`}>{regular ? <>Was {formatMoney(regular)}</> : 'Try the workspace'}</p>
      <div className="landing-price-amount"><strong>{formatMoney(price)}</strong><span>/{period}</span></div>
      <p className="landing-price-saving">{saving > 0 ? `Save ${formatMoney(saving)} (${Math.round(saving / regular * 100)}%)` : 'No card required to start'}</p>
      <ul>{details.map(detail => <li key={detail}><Check size={14} aria-hidden="true" /><span>{detail}</span></li>)}</ul>
      <Link to="/register">{name === 'Free trial' ? 'Start free' : 'Choose plan'} <ArrowRight size={15} /></Link>
    </article>
  )
}

export default function ClientHome() {
  const { user } = useAuth()
  const { plans } = usePlans()
  if (user) {
    const destination = user.needsOnboarding
      ? '/onboarding'
      : user.role === 'superadmin' ? '/superadmin/dashboard' : '/dashboard'
    return <Navigate to={destination} replace />
  }
  const monthly = Number(plans.monthly ?? 199)
  const annual = Number(plans.annual ?? 1799)
  const monthlyRegular = 400
  const annualRegular = monthlyRegular * 12

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">APPOINTMENT SOFTWARE FOR SERVICE BUSINESSES</p>
            <h1>Keep bookings organized.<br /><span>Focus on your clients.</span></h1>
            <p className="landing-hero-description">Let clients request your service from your own landing page website. Review appointments, schedules, and customer details in one place.</p>
            <div className="landing-hero-actions"><Link to="/register" className="landing-button-primary">Start free <ArrowRight size={18} /></Link><a href="#features" className="landing-button-secondary">See how it works <ChevronRight size={18} /></a></div>
            <p className="landing-hero-note">Pet Care Services is available now. Other service types are coming soon.</p>
          </div>
          <div className="landing-booking-shot" aria-label="Preview of a business booking page">
            <div className="landing-browser-bar"><span className="landing-browser-dots"><i /><i /><i /></span><span className="landing-browser-address">appointeefy… /book/<b>your-business-name</b></span></div>
            <div className="landing-booking-header"><div className="landing-booking-mark">YB</div><div><strong>Your Business Name</strong><small>Pet sitting services</small></div><span className="landing-booking-link">Booking page</span></div>
            <div className="landing-booking-content"><div><p className="landing-booking-kicker">BOOK WITH US</p><h2>Care for your pet,<br />on your schedule.</h2><p>Choose a date and send a booking request in a few simple steps.</p></div><div className="landing-booking-form"><span>Request a booking</span><label>Service <strong>Pet Care Services</strong></label><label>Preferred date <strong>Select a date <CalendarDays size={15} /></strong></label><label>Pet details <strong>Dog · 1 pet</strong></label><span className="landing-booking-submit">Continue <ArrowRight size={15} /></span></div></div>
            <p className="landing-preview-caption">Illustrative booking page · Your actual page uses your business details</p>
          </div>
        </div>
      </section>

      <section className="landing-service-section" aria-labelledby="service-types-title"><div className="landing-container landing-service-heading"><div><p className="landing-eyebrow">BUILT FOR PERSONAL SERVICES</p><h2 id="service-types-title">Start with Pet Care Services</h2></div><p>More service types are on the way.</p></div><div className="landing-container landing-service-list" aria-label="Available and upcoming service types">{serviceTypes.map(([name, available]) => <div className="landing-service-pill" key={name}><i className={available ? 'is-live' : ''} /><span>{name}</span><small>{available ? 'Available now' : 'Coming soon'}</small></div>)}</div></section>

      <section id="features" className="landing-features landing-container"><div className="landing-section-heading"><p className="landing-eyebrow">FOR YOUR BUSINESS</p><h2>Your landing page website and booking tools, together.</h2><p>Share your page, review requests, and keep client details close at hand.</p></div><div className="landing-feature-grid">{features.map(({ icon: Icon, title, copy }) => <article key={title} className="landing-feature"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section id="pricing" className="landing-pricing"><div className="landing-container"><div className="landing-section-heading"><p className="landing-eyebrow">SIMPLE PRICING</p><h2>Choose what works for your business.</h2><p>Each plan includes your business booking page, appointment tools, customer records, and analytics.</p></div><div className="landing-price-grid"><PriceCard name="Free trial" price={0} period="30 days" details={['Business booking page', 'Appointments & calendar', 'Customer records']} /><PriceCard name="Monthly" price={monthly} period="month" regular={monthlyRegular} saving={Math.max(0, monthlyRegular - monthly)} details={['Named booking link', 'Custom booking page', 'Records & analytics']} highlight /><PriceCard name="Annual" price={annual} period="year" regular={annualRegular} saving={Math.max(0, annualRegular - annual)} details={['Named booking link', 'Custom booking page', 'Records & analytics']} /></div><p className="landing-pricing-note">Regular rate: ₱400/month or ₱4,800/year. Current promotional prices appear above. Subscription payments use GCash and are reviewed after you submit proof.</p></div></section>

      <section className="landing-closing"><div className="landing-container"><div><p className="landing-eyebrow">READY WHEN YOU ARE</p><h2>Give clients a simpler way to book.</h2><p>Set up your Pet Care Services page and manage new requests from one workspace.</p></div><Link to="/register" className="landing-button-primary">Get started <ArrowRight size={18} /></Link></div></section>
    </div>
  )
}
