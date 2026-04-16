"use client"

import Link from 'next/link'
import {
  FileEdit,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  Settings2,
  TerminalSquare,
} from 'lucide-react'

function LoginSelection() {
  return (
    <div className="auth-page min-h-screen bg-[#eef1fb] text-[#1f2937]">
      <nav className="fixed top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-[0_12px_30px_rgba(4,14,31,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-3xl font-black tracking-tight text-[#4a40e0]">
              <GraduationCap className="h-8 w-8" />
              <span>Testify</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <a href="#signin-options" className="border-b-2 border-[#4a40e0] px-2 py-1 text-sm font-bold text-[#4a40e0]">Sign In</a>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-6 pb-20 pt-32 lg:px-8">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#1d2a44]">Choose your entry point</h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-[#5a657f]">
            Welcome back to Testify Assessment Systems. Please select your role to proceed to the secure login portal.
          </p>
        </header>

        <div id="signin-options" className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-[#dbe2f4] bg-white/70 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:bg-white">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#4a40e0]/10 text-[#4a40e0]">
              <Settings2 className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-[#1f2a43]">Admin auth</h3>
            <p className="mb-8 min-h-[96px] text-[#5a657f]">Configure institution settings, manage licenses, and oversee global system health.</p>
            <Link href="/admin-login" className="block w-full rounded-xl bg-gradient-to-br from-[#4a40e0] to-[#9795ff] py-3 font-semibold text-white shadow-lg shadow-[#4a40e0]/20 transition-opacity hover:opacity-90">
              Enter portal
            </Link>
          </article>

          <article className="rounded-xl border border-[#dbe2f4] bg-white/70 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:bg-white">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#702ae1]/12 text-[#702ae1]">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-[#1f2a43]">Teacher login</h3>
            <p className="mb-8 min-h-[96px] text-[#5a657f]">Create assessments, grade responses, and analyze student performance metrics.</p>
            <Link href="/teacher-login" className="portal-entry-secondary block w-full rounded-xl bg-[#d6def4] py-3 font-semibold text-[#1f2a43] transition-colors hover:bg-[#c9d3f0]">
              Enter portal
            </Link>
          </article>

          <article className="rounded-xl border border-[#dbe2f4] bg-white/70 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:bg-white">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#53ddfc]/25 text-[#006576]">
              <FileEdit className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-[#1f2a43]">Student login</h3>
            <p className="mb-8 min-h-[96px] text-[#5a657f]">Take scheduled exams, view results, and access personal learning resources.</p>
            <Link href="/student-login" className="portal-entry-secondary block w-full rounded-xl bg-[#d6def4] py-3 font-semibold text-[#1f2a43] transition-colors hover:bg-[#c9d3f0]">
              Enter portal
            </Link>
          </article>

          <article className="rounded-xl border border-[#dbe2f4] bg-white/70 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:bg-white">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#040e1f]/10 text-[#040e1f]">
              <TerminalSquare className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-[#1f2a43]">God login</h3>
            <p className="mb-8 min-h-[96px] text-[#5a657f]">Root access for system architects and developers. Full database and engine control.</p>
            <Link href="/god-login" className="block w-full rounded-xl bg-[#040e1f] py-3 font-semibold text-white transition-opacity hover:opacity-90">
              Enter portal
            </Link>
          </article>
        </div>

        <section className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-[#e5e9f7] p-10 text-center">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#4a40e0]/5 blur-3xl" />
          <h4 className="mb-2 text-2xl font-bold text-[#1f2a43]">Trouble signing in?</h4>
          <p className="mb-8 text-[#5a657f]">Can't remember your password or experiencing technical issues? Our team is here to help.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/forgot-password" className="flex items-center gap-2 rounded-xl border border-[#a2adc4]/30 bg-white px-6 py-3 font-semibold text-[#4a40e0] transition-colors hover:bg-[#f4f6ff]">
              <KeyRound className="h-4 w-4" />
              Recover Password
            </Link>
            <button type="button" className="flex items-center gap-2 rounded-xl border border-[#a2adc4]/30 bg-white px-6 py-3 font-semibold text-[#1f2a43] transition-colors hover:bg-[#f4f6ff]">
              <LifeBuoy className="h-4 w-4" />
              Support Desk
            </button>
          </div>
        </section>
      </main>

      <footer id="resources" className="mt-auto w-full bg-[#f8f9fc] py-12 text-sm">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <span className="mb-4 block text-xl font-black text-[#1f2937]">Testify</span>
            <p className="max-w-xs leading-relaxed text-[#6c778c]">The gold standard in digital assessment systems, empowering educational excellence across the globe.</p>
          </div>

          <div>
            <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#1f2937]">Platform</h5>
            <div className="flex flex-col gap-2">
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">Security</button>
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">Status</button>
            </div>
          </div>

          <div>
            <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#1f2937]">Legal</h5>
            <div className="flex flex-col gap-2">
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">Privacy Policy</button>
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">Terms of Service</button>
            </div>
          </div>

          <div>
            <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#1f2937]">Support</h5>
            <div className="flex flex-col gap-2">
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">Contact Support</button>
              <button type="button" className="w-fit text-[#6c778c] underline underline-offset-4 transition-colors hover:text-[#4a40e0]">API Documentation</button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-slate-200 px-6 pt-8 text-center text-[#6c778c] lg:px-8">
          <p>© 2026 Testify Assessment Systems. All rights reserved</p>
        </div>
      </footer>
    </div>
  )
}

export default LoginSelection