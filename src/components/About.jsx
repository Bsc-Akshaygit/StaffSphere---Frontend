import { useState } from 'react'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    label: 'Employee Directory',
    desc: 'A live, searchable directory of every employee with full profiles, designations, contact info and history in one place.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    label: 'Analytics Dashboard',
    desc: 'Visual salary distributions, headcount breakdowns by role, top earner lists and donut charts — all in real time.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    label: 'Secure Auth',
    desc: 'JWT access tokens with automatic refresh token rotation keep sessions alive securely without interrupting your work.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    label: 'Record Management',
    desc: 'Add, update, and remove employee records with instant validation, clean forms, and seamless backend sync.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
    ),
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    label: 'Smart Filtering',
    desc: 'Filter by designation, sort by salary or joining date, and search by name, email, phone or Aadhaar — instantly.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    gradient: 'from-violet-500 to-fuchsia-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    label: 'Table & Card Views',
    desc: 'Switch between a dense table layout and a visual card grid — whichever suits how you prefer to browse records.',
  },
]

const stats = [
  { value: '500+', label: 'Companies', sub: 'trust StaffSphere daily' },
  { value: '50K+', label: 'Records', sub: 'managed without friction' },
  { value: '99.9%', label: 'Uptime', sub: 'guaranteed reliability' },
  { value: '<200ms', label: 'Response', sub: 'average API latency' },
]

const timeline = [
  {
    year: '2023',
    gradient: 'from-indigo-500 to-purple-600',
    title: 'Foundation',
    desc: 'Built the core employee directory, JWT authentication, and Spring Boot REST API from the ground up.',
  },
  {
    year: '2024',
    gradient: 'from-pink-500 to-rose-600',
    title: 'Analytics',
    desc: 'Launched the real-time dashboard with salary charts, headcount donut graphs and top earner insights.',
  },
  {
    year: '2025',
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Token Security',
    desc: 'Implemented refresh token rotation — seamless session continuity with zero manual re-logins.',
  },
  {
    year: '2026',
    gradient: 'from-amber-500 to-orange-600',
    title: 'StaffSphere',
    desc: 'Full rebrand with a redesigned UI, smart filtering, inline confirmations and a polished mobile experience.',
  },
]

const values = [
  {
    emoji: '🎯',
    title: 'Simplicity First',
    desc: 'Every feature is designed to be immediately understandable — no documentation required.',
  },
  {
    emoji: '🔒',
    title: 'Security by Default',
    desc: 'Tokens, encrypted fields, and role-based access are built in from day one — not bolted on later.',
  },
  {
    emoji: '⚡',
    title: 'Performance',
    desc: 'Sub-200ms API responses and optimistic UI updates mean the app always feels instant.',
  },
]

function About({ onBack, onLogin, onSignup, onViewEmployees }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isLoggedIn = Boolean(localStorage.getItem('accessToken'))

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Ambient glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-purple-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-pink-300/15 blur-3xl" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">

            <button onClick={onBack} className="flex items-center gap-3 group focus:outline-none cursor-pointer">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">StaffSphere</span>
                <span className="text-[11px] font-medium text-slate-500">Employee Tracker</span>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-1.5">
              <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all cursor-pointer">
                Home
              </button>
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 cursor-default">
                About
              </button>
              <div className="w-px h-6 bg-slate-200 mx-3" />
              {isLoggedIn ? (
                <button onClick={onViewEmployees} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                  Workforce
                </button>
              ) : (
                <>
                  <button onClick={onLogin} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                    Login
                  </button>
                  <button onClick={onSignup} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                    Signup
                  </button>
                </>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden w-11 h-11 rounded-xl bg-white/80 ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer">
              {mobileMenuOpen
                ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100 flex flex-col gap-2">
              <button onClick={() => { onBack(); setMobileMenuOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">Home</button>
              <button className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-600">About</button>
              {isLoggedIn
                ? <button onClick={() => { onViewEmployees(); setMobileMenuOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-indigo-600">Workforce</button>
                : <>
                    <button onClick={() => { onLogin(); setMobileMenuOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-indigo-600">Login</button>
                    <button onClick={() => { onSignup(); setMobileMenuOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">Signup</button>
                  </>
              }
            </div>
          )}
        </div>
      </nav>

      <main>

        {/* ── Hero ── */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 shadow-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="text-sm font-semibold text-slate-700">About StaffSphere</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-7 leading-[1.05]">
            <span className="block text-slate-900">HR management,</span>
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              done right.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-12">
            StaffSphere is a modern employee tracking platform built for speed, clarity, and security.
            We took everything painful about legacy HR systems and rebuilt it from scratch with a developer-first mindset.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {isLoggedIn ? (
              <button
                onClick={onViewEmployees}
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-base shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                Open Workforce Directory
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <>
                <button
                  onClick={onSignup}
                  className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-base shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button
                  onClick={onLogin}
                  className="px-8 py-4 rounded-2xl text-slate-700 font-semibold text-base ring-1 ring-slate-200 bg-white/80 hover:bg-white hover:ring-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 shadow-sm mb-5">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">Our journey</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              How we got here
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Four years of building, learning and shipping — a timeline of the key milestones.
            </p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 bottom-0 -translate-x-px w-px bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 hidden md:block" />

            <div className="space-y-8">
              {timeline.map((item, i) => (
                <div key={i} className={`flex flex-col md:flex-row items-center gap-6 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  {/* Card */}
                  <div className="flex-1">
                    <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-7 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${item.gradient} text-white text-xs font-bold mb-4`}>
                        {item.year}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className={`hidden md:flex w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} items-center justify-center shadow-lg shrink-0 z-10`}>
                    <span className="text-white text-xs font-extrabold">{item.year.slice(2)}</span>
                  </div>

                  {/* Empty side */}
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 sm:p-16 text-center relative overflow-hidden shadow-2xl shadow-purple-500/20">
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
                Ready to take control of your workforce?
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto mb-10">
                Join hundreds of teams that already use StaffSphere to manage their people — faster, cleaner, smarter.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                {isLoggedIn ? (
                  <button
                    onClick={onViewEmployees}
                    className="group px-9 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Go to Directory
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onSignup}
                      className="group px-9 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      Create Account
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button
                      onClick={onLogin}
                      className="px-9 py-4 rounded-2xl bg-white/15 ring-1 ring-white/30 text-white font-bold text-base hover:bg-white/25 transition-all cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

export default About
