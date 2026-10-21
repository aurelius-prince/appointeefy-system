import { Link } from 'react-router-dom'
import { Calendar, Users, BarChart3, CheckCircle, Star, ArrowRight, Zap, Shield, Smartphone } from 'lucide-react'
import { usePlans } from '../../hooks/usePlans'

const features = [
  { icon: Calendar,    title: 'Smart Scheduling',      desc: 'Let your clients book 24/7 with your custom booking page. Automatic availability management.', color: 'bg-blue-50 text-blue-600' },
  { icon: Users,       title: 'Client Management',     desc: 'Track all your customers, their pets, appointment history, and total spend in one place.',      color: 'bg-purple-50 text-purple-600' },
  { icon: BarChart3,   title: 'Business Analytics',    desc: 'Get insights on revenue, popular services, and appointment trends to grow your business.',       color: 'bg-green-50 text-green-600' },
  { icon: Zap,         title: 'Instant Notifications', desc: 'Real-time updates for every booking, cancellation, and payment — never miss a thing.',           color: 'bg-yellow-50 text-yellow-600' },
  { icon: Shield,      title: 'Secure & Reliable',     desc: 'Enterprise-grade security with Supabase. Your data is safe, private, and always available.',     color: 'bg-red-50 text-red-600' },
  { icon: Smartphone,  title: 'Mobile Friendly',       desc: 'Fully responsive on all devices. Manage appointments from your phone, tablet, or desktop.',      color: 'bg-pink-50 text-pink-600' },
]

const testimonials = [
  { name: 'Maria Santos', business: 'Fur & Paws Grooming',    text: 'Appointeefy completely transformed how I manage bookings. My clients love the easy online booking!', rating: 5 },
  { name: 'Carlo Reyes',  business: 'Happy Paws Vet Clinic',  text: 'The analytics feature helped me understand my peak hours and I was able to hire accordingly. Highly recommend!', rating: 5 },
  { name: 'Ana Cruz',     business: 'Pet Paradise Boarding',  text: 'Setup was incredibly easy. Had my booking page live within 30 minutes. Worth every peso!', rating: 5 },
]

const steps = [
  { step: '01', title: 'Create your account',  desc: 'Sign up and set up your business profile in minutes.' },
  { step: '02', title: 'Add your services',    desc: 'List your services, set prices, and configure availability.' },
  { step: '03', title: 'Share your link',      desc: 'Share your unique booking link with clients via social media or messaging.' },
  { step: '04', title: 'Grow your business',   desc: 'Manage appointments, track payments, and analyze your growth.' },
]

export default function ClientHome() {
  const { plans } = usePlans()

  const monthly = plans.monthly ?? 199
  const annual  = plans.annual  ?? 1799
  const savings = (monthly * 12) - annual

  const pricingPlans = [
    {
      name: 'Free Trial', price: '₱0', period: '/30 days',
      desc: 'Try all features free for 30 days. No credit card required.',
      features: ['Full access to all features', 'Custom booking page', 'Client management', 'Analytics dashboard', 'Payment tracking', 'Expires after 30 days'],
      cta: 'Start Free Trial', highlight: false, badge: null,
    },
    {
      name: 'Monthly', price: `₱${monthly.toLocaleString()}`, period: '/month',
      desc: 'Perfect for growing businesses. Cancel anytime.',
      features: ['Unlimited appointments', 'Unlimited services', 'Custom booking page', 'Client management', 'Full analytics', 'Payment tracking', 'Priority support'],
      cta: 'Get Started', highlight: true, badge: 'Most Popular',
    },
    {
      name: 'Annual', price: `₱${annual.toLocaleString()}`, period: '/year',
      desc: `Best value. Save ₱${savings.toLocaleString()} vs monthly billing.`,
      features: ['Everything in Monthly', `Save ₱${savings.toLocaleString()}/year`, `Equivalent to ₱${Math.round(annual / 12).toLocaleString()}/month`, '2 months FREE', 'Priority support', 'Early access to new features'],
      cta: 'Get Started', highlight: false, badge: 'Best Value',
    },
  ]

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <Zap size={14} className="text-yellow-300" />
            <span>The #1 Appointment System for Philippine Businesses</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Book More.<br />
            <span className="text-blue-200">Stress Less.</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            Appointeefy gives your business a beautiful booking page, smart scheduling, and powerful tools to manage clients — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/20 transition-colors text-base">
              See How It Works
            </a>
          </div>
          <p className="text-blue-200 text-sm mt-5">30-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+',    label: 'Active Businesses' },
            { value: '50,000+', label: 'Appointments Booked' },
            { value: '99.9%',   label: 'Uptime Guarantee' },
            { value: '4.9★',    label: 'Average Rating' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-blue-600">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Everything you need to run your business</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">From booking to payment tracking — Appointeefy has all the tools to keep your business running smoothly.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Get started in minutes</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">No technical knowledge required. Set up your booking page and start accepting appointments today.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                  {step}
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Loved by businesses across the Philippines</h2>
          <p className="text-gray-500 text-lg">See what our customers have to say about Appointeefy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ name, business, text, rating }) => (
            <div key={name} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">"{text}"</p>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{name}</p>
                <p className="text-xs text-gray-400">{business}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {pricingPlans.map(({ name, price, period, desc, features: f, cta, highlight, badge }) => (
              <div key={name} className={`rounded-2xl p-8 ${highlight ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200 scale-105' : 'bg-white border border-gray-100 shadow-sm'}`}>
                {badge && (
                  <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 ${highlight ? 'bg-yellow-400 text-yellow-900' : 'bg-green-100 text-green-700'}`}>
                    {badge}
                  </div>
                )}
                <h3 className={`font-bold text-lg mb-1 ${highlight ? 'text-white' : 'text-gray-800'}`}>{name}</h3>
                <p className={`text-sm mb-4 ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-gray-900'}`}>{price}</span>
                  <span className={`text-sm mb-1.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>{period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {f.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} className={highlight ? 'text-blue-200' : 'text-blue-500'} />
                      <span className={highlight ? 'text-blue-100' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className={`block text-center font-bold py-3 rounded-xl transition-colors ${highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to grow your business?</h2>
          <p className="text-blue-100 text-lg mb-8">Join hundreds of Philippine businesses using Appointeefy to manage their appointments.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg">
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <p className="text-blue-200 text-sm mt-4">30-day free trial · No credit card required</p>
        </div>
      </section>

    </div>
  )
}
