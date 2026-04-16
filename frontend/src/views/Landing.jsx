"use client"

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Gavel,
  GraduationCap,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

const trustPillars = [
  { label: 'Secure SaaS', Icon: ShieldCheck },
  { label: 'Multi-Org Isolation', Icon: Building2 },
  { label: 'Real-time Eval', Icon: Zap },
  { label: 'Scalable', Icon: Layers },
]

const featureCards = [
  {
    title: 'RBAC Roles',
    description: 'Granular access control for admins, creators, proctors, and students.',
    icon: ShieldCheck,
  },
  {
    title: 'Smart Builder',
    description: 'AI-assisted question generation and structured question bank workflows.',
    icon: Bot,
  },
  {
    title: 'Auto Eval',
    description: 'Instant grading for objective tests with manual override capabilities.',
    icon: Sparkles,
  },
  {
    title: 'Anti-Cheat',
    description: 'Browser-lock and proctoring signals to preserve exam integrity.',
    icon: Gavel,
  },
]

const steps = [
  { title: 'Register', text: 'Create your root organization and invite admins.' },
  { title: 'Define', text: 'Set up subjects and build your question banks.' },
  { title: 'Publish', text: 'Schedule exams and distribute candidate access.' },
  { title: 'Monitor', text: 'Track participation and integrity alerts in real-time.' },
  { title: 'Report', text: 'Export analytics and performance insights instantly.' },
]

const plans = [
  {
    name: 'Free',
    price: '$0/mo',
    desc: 'Perfect for individual educators.',
    features: ['Up to 50 candidates', 'Basic exam types', 'Manual grading'],
    cta: 'Start for Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$149/mo',
    desc: 'Ideal for mid-sized testing centers.',
    features: ['Unlimited candidates', 'AI proctoring lite', 'Smart builder and auto-eval'],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For large universities and corporations.',
    features: ['Unlimited organizations', 'White-labeling', 'Dedicated success manager'],
    cta: 'Contact Sales',
    featured: false,
  },
]

function Landing() {
  return (
    <div className="min-h-screen bg-[#f4f6ff] text-[#242f41]">
      <header className="sticky top-0 z-50 border-b border-[#d9e2f5] bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#4a40e0]">
            <GraduationCap className="h-7 w-7" />
            <span>Testify</span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-[#4a40e0]">Features</a>
            <a href="#pricing" className="transition hover:text-[#4a40e0]">Pricing</a>
            <a href="#how-it-works" className="transition hover:text-[#4a40e0]">How it works</a>
          </div>
          <Link
            href="/login-selection"
            className="rounded-xl bg-[#4a40e0] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4a40e0]/25 transition hover:bg-[#3c32cf]"
          >
            Login
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-24">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#4a40e0]/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#702ae1]/10 blur-3xl" />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-[#dcc9ff] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#5b00c7]">
                Redefining Assessments
              </span>
              <h1 className="mt-6 text-5xl font-extrabold leading-tight md:text-7xl">
                Take Your Exams <span className="bg-gradient-to-r from-[#4a40e0] to-[#702ae1] bg-clip-text text-transparent">Online</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#515c70]">
                The ultimate examination ecosystem for secure, smart, and scalable assessments across multiple organizations.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/login-selection"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#9795ff] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-[#4a40e0]/20 transition hover:scale-[1.02]"
                >
                  Get Started <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login-selection"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#a2adc4] bg-white px-8 py-4 text-lg font-bold text-[#242f41] transition hover:bg-[#ecf1ff]"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[#d9e2f5] bg-white p-5 shadow-2xl">
              <div className="rounded-2xl border border-[#e0e8fa] bg-[#f8faff] p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#6a738a]">Dashboard preview</p>
                <h3 className="mt-3 text-2xl font-bold">Performance and Integrity Snapshot</h3>
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl bg-[#ecf1ff] p-4">
                    <p className="text-xs uppercase tracking-widest text-[#5a6480]">Automated grading</p>
                    <div className="mt-2 h-2 rounded-full bg-[#d3ddf4]">
                      <div className="h-2 w-[85%] rounded-full bg-[#4a40e0]" />
                    </div>
                    <p className="mt-2 text-xs text-[#5a6480]">85% objective responses evaluated</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#f1f5ff] p-4">
                      <p className="text-xs uppercase tracking-wider text-[#5a6480]">Live sessions</p>
                      <p className="mt-1 text-2xl font-extrabold text-[#4a40e0]">1,248</p>
                    </div>
                    <div className="rounded-xl bg-[#f1f5ff] p-4">
                      <p className="text-xs uppercase tracking-wider text-[#5a6480]">Integrity alerts</p>
                      <p className="mt-1 text-2xl font-extrabold text-[#702ae1]">12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#ecf1ff] px-6 py-12">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6">
            {trustPillars.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-lg font-bold text-[#334155]">
                <item.Icon className="h-5 w-5 text-[#4a40e0]" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="px-6 py-28">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-extrabold md:text-5xl">Designed for Institutional Excellence</h2>
              <p className="mt-4 text-lg text-[#515c70]">Every tool you need to run high-scale online examinations with confidence.</p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((card) => (
                <article key={card.title} className="rounded-3xl border border-[#d9e2f5] bg-white p-7 shadow-panel">
                  <div className="mb-6 inline-flex rounded-2xl bg-[#ecebff] p-3 text-[#4a40e0]">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold">{card.title}</h3>
                  <p className="mt-3 leading-relaxed text-[#515c70]">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-6 py-28">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-16 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-extrabold md:text-5xl">How It Works</h2>
                <p className="mt-4 text-lg text-[#515c70]">Five simple steps to digitize your institution’s assessment flow.</p>
              </div>
              <button type="button" className="inline-flex items-center gap-2 text-base font-bold text-[#4a40e0]">
                View full documentation <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-10 md:grid-cols-5">
              {steps.map((step, index) => (
                <div key={step.title}>
                  <p className="text-6xl font-black text-[#d9e2f5]">{String(index + 1).padStart(2, '0')}</p>
                  <h4 className="mt-5 text-2xl font-bold">{step.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-[#515c70]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-28">
          <div className="mx-auto w-full max-w-7xl">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold md:text-5xl">Simple, Scalable Pricing</h2>
              <p className="mt-4 text-lg text-[#515c70]">Pick the plan that matches your institutional requirements.</p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-3xl p-9 ${
                    plan.featured
                      ? 'scale-[1.02] bg-[#040e1f] text-[#f4f1ff] shadow-2xl shadow-[#4a40e0]/25'
                      : 'border border-[#d9e2f5] bg-white text-[#242f41]'
                  }`}
                >
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-4 text-4xl font-black">{plan.price}</p>
                  <p className={`mt-3 text-sm ${plan.featured ? 'text-[#a9b4cd]' : 'text-[#515c70]'}`}>{plan.desc}</p>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className={`h-4 w-4 ${plan.featured ? 'text-[#97a0ff]' : 'text-[#4a40e0]'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`mt-10 w-full rounded-xl py-3.5 text-sm font-bold transition ${
                      plan.featured
                        ? 'bg-gradient-to-r from-[#4a40e0] to-[#9795ff] text-white hover:opacity-95'
                        : 'border border-[#a2adc4] bg-white text-[#242f41] hover:bg-[#ecf1ff]'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#d9e2f5] bg-white p-12 text-center shadow-xl md:p-16">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#4a40e0]/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#702ae1]/10 blur-3xl" />
            <h2 className="relative text-4xl font-extrabold md:text-5xl">Ready to Digitize Your Examination System?</h2>
            <p className="relative mx-auto mt-6 max-w-2xl text-lg text-[#515c70]">
              Join institutions already leveraging Testify to deliver secure and seamless exams worldwide.
            </p>

            <div className="relative mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/login-selection"
                className="rounded-2xl bg-gradient-to-r from-[#4a40e0] to-[#9795ff] px-10 py-4 text-lg font-bold text-white shadow-xl shadow-[#4a40e0]/20"
              >
                Get Started
              </Link>
              <Link
                href="/login-selection"
                className="rounded-2xl border border-[#a2adc4] bg-[#ecf1ff] px-10 py-4 text-lg font-bold text-[#242f41]"
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d9e2f5] bg-white px-6 py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-10 md:grid-cols-4">
          <div>
            <div className="text-xl font-black text-[#1e293b]">Testify</div>
            <p className="mt-4 text-sm leading-relaxed text-[#64748b]">
              The Digital Curator. Professionalizing digital assessments for modern institutions.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Product</h4>
            <div className="mt-4 space-y-3 text-sm text-[#64748b]">
              <a href="#features" className="transition hover:text-[#4a40e0]">Features</a>
              <a href="#pricing" className="transition hover:text-[#4a40e0]">Pricing</a>
              <a href="#how-it-works" className="transition hover:text-[#4a40e0]">How it works</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Company</h4>
            <div className="mt-4 space-y-3 text-sm text-[#64748b]">
              <a href="#" className="transition hover:text-[#4a40e0]">Privacy Policy</a>
              <a href="#" className="transition hover:text-[#4a40e0]">Terms of Service</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Insights</h4>
            <div className="mt-4 space-y-3 text-sm text-[#64748b]">
              <a href="#" className="transition hover:text-[#4a40e0]">Case Studies</a>
              <a href="#" className="transition hover:text-[#4a40e0]">Knowledge Base</a>
              <a href="#" className="transition hover:text-[#4a40e0]">Support</a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col items-center justify-between gap-3 border-t border-[#e2e8f0] pt-8 text-xs text-[#64748b] md:flex-row">
          <p>© 2026 Testify. All rights reserved.</p>
          <div className="inline-flex items-center gap-2 text-[#4a40e0]">
            <BarChart3 className="h-4 w-4" />
            Built for secure, scalable online assessments
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
