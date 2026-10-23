import { useState } from 'react'

function Home({ onLogin, onSignup, onViewEmployees, onAbout } = {}) {
  const [active, setActive] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isLoggedIn = Boolean(localStorage.getItem('accessToken'))

  const navItems = [
    { label: 'Home', key: 'home' },
    { label: 'About', key: 'about' },
    ...(isLoggedIn ? [{ label: 'Workforce', key: 'viewEmployee' }] : []),
    ...(isLoggedIn ? [] : [
      { label: 'Login', key: 'login' },
      { label: 'Signup', key: 'signup' },
    ]),
  ]

  const handleNavClick = (key) => {
    setActive(key)
    setMobileMenuOpen(false)
    if (key === 'login') {
      if (onLogin) onLogin()
    } else if (key === 'signup') {
      if (onSignup) onSignup()
    } else if (key === 'viewEmployee') {
      if (onViewEmployees) onViewEmployees()
    } else if (key === 'about') {
      if (onAbout) onAbout()
    } else if (key === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-40 -left-32 h-[400px] w-[400px] rounded-full bg-purple-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-cyan-300/20 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center py-3">
            <div 
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  StaffSphere
                </span>
                <span className="text-[11px] font-medium text-slate-500">Employee Tracker</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              {navItems.slice(0, 2).map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                    active === item.key
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                      : 'text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-200 mx-3" />
              {navItems.slice(2).map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                    item.key === 'signup'
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 hover:-translate-y-0.5'
                      : 'text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-400 hover:text-indigo-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-11 h-11 rounded-xl bg-white/80 ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100 flex flex-col gap-2 animate-fade-in">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    item.key === 'signup'
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold'
                      : item.key === 'login'
                      ? 'bg-slate-100 text-indigo-600 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <main>
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-slate-700">Trusted by 500+ companies worldwide</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.05]">
              <span className="block text-slate-900">Transform Your</span>
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                Workforce Management
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Streamline HR operations, manage employee records, track attendance, and automate payroll
              — all in one beautifully designed platform built for modern teams.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
              {isLoggedIn && onViewEmployees ? (
                <button
                  onClick={onViewEmployees}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-pointer"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Open Workforce Directory
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </button>
              ) : (
                <button 
                  onClick={onSignup}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 overflow-hidden cursor-pointer"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Get Started Free
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}

export default Home
