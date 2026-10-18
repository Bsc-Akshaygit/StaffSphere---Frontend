import { useState } from 'react'

function Signup({ onBack, onNavigateToLogin }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    agreeTerms: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  // Password strength calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' }
    let score = 0
    if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' }
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' }
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-indigo-500' }
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(form.password)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (serverError) {
      setServerError('')
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) {
      errs.name = 'Full name is required'
    } else if (form.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }

    if (!form.email.trim()) {
      errs.email = 'Work email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address'
    }

    if (!form.password) {
      errs.password = 'Password is required'
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    if (!form.agreeTerms) {
      errs.agreeTerms = 'You must accept the Terms of Service to continue'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setServerError('')

    try {
      const response = await fetch('http://localhost:8080/platform/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.error || `Signup failed with status: ${response.status}`)
      }

      setSignupSuccess(true)
      setTimeout(() => {
        setSignupSuccess(false)
        if (onNavigateToLogin) onNavigateToLogin()
      }, 2200)
    } catch (err) {
      console.error('Signup error:', err)
      setServerError(err.message || 'Unable to connect to server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden flex flex-col justify-between relative">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[450px] w-[450px] rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-purple-300/20 blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center py-3">
            <button
              onClick={onBack}
              className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  EMS
                </span>
                <span className="text-[11px] font-medium text-slate-500">Employee Management System</span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white transition-all duration-300 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              <div className="hidden sm:block w-px h-6 bg-slate-200" />
              <span className="hidden md:inline text-sm text-slate-500">Already registered?</span>
              <button
                onClick={onNavigateToLogin}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white hover:ring-indigo-400 hover:text-indigo-600 hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left / Feature Showcase */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200 shadow-sm mb-6">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">14-Day Free Enterprise Trial</span>
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                Empower your organization with{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Modern HR
                </span>
              </h1>
              
              <p className="text-slate-600 text-base leading-relaxed">
                Join thousands of fast-growing enterprises automating onboarding, attendance tracking, compliance, and payroll in real time.
              </p>
            </div>

            {/* Feature Perks Box */}
            <div className="space-y-3.5">
              {[
                { title: 'Zero Setup Friction', desc: 'Get your full workforce onboarded in under 5 minutes' },
                { title: 'Automated Payroll Engine', desc: '1-click salary calculations, tax compliance & payslips' },
                { title: 'Enterprise-Grade Security', desc: 'SOC2 compliant with 256-bit encryption for all records' },
              ].map((perk, i) => (
                <div key={i} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-slate-100 shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{perk.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{perk.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2 overflow-hidden">
                {['RS', 'PS', 'AM', 'SP'].map((init, idx) => (
                  <div
                    key={idx}
                    className={`inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                      idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-pink-500' : idx === 2 ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Over <strong className="text-slate-900 font-bold">10,000+ HR leaders</strong> manage teams with EMS
              </div>
            </div>
          </div>

          {/* Right / Sign Up Form Card */}
          <div className="lg:col-span-7 w-full max-w-xl mx-auto">
            <div className="relative">
              {/* Outer glow border */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-indigo-500/30 rounded-[2.5rem] blur-xl opacity-70" />
              
              <div className="relative rounded-[2rem] bg-white/85 backdrop-blur-2xl ring-1 ring-white/90 shadow-2xl shadow-purple-500/10 p-7 sm:p-10">
                
                {/* Header inside form */}
                <div className="text-center sm:text-left mb-8">
                  <div className="inline-flex sm:hidden items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-md shadow-purple-500/30 mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Create EMS Account
                  </h2>
                  <p className="text-slate-500 text-sm mt-1.5">
                    Start your 14-day free trial. No credit card required.
                  </p>
                </div>

                {/* Signup Success Alert */}
                {signupSuccess && (
                  <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-[1.5px] shadow-lg shadow-emerald-500/20">
                    <div className="rounded-[15px] bg-white/95 backdrop-blur px-4 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Account created successfully! Taking you to login...
                      </div>
                    </div>
                  </div>
                )}

                {/* Server Error Alert */}
                {serverError && (
                  <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-sm font-semibold">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">{serverError}</div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50/70 border-2 transition-all duration-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
                          errors.name
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="admin@company.com"
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50/70 border-2 transition-all duration-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
                          errors.email
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="At least 8 characters"
                        className={`w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/70 border-2 transition-all duration-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
                          errors.password
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {form.password && (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-slate-500">Password Strength:</span>
                          <span className={`${passwordStrength.color.replace('bg-', 'text-')}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {errors.password && (
                      <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={form.agreeTerms}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 rounded-lg text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 leading-snug">
                        I agree to the <span className="text-indigo-600 font-semibold hover:underline">Terms of Service</span> and <span className="text-indigo-600 font-semibold hover:underline">Privacy Policy</span>.
                      </span>
                    </label>
                    {errors.agreeTerms && (
                      <p className="mt-1 text-xs font-bold text-red-600">{errors.agreeTerms}</p>
                    )}
                  </div>

                  {/* Primary Signup Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full relative group mt-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 disabled:opacity-75 overflow-hidden cursor-pointer"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating Workspace...
                        </>
                      ) : (
                        <>
                          Create Free Account
                          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/90 px-3 text-slate-400 font-semibold tracking-wider">
                      Or sign up with
                    </span>
                  </div>
                </div>

                {/* Social Signup Options */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 font-semibold text-xs text-slate-700 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 font-semibold text-xs text-slate-700 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-slate-900 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    GitHub
                  </button>
                </div>

                {/* Switch to Login */}
                <div className="mt-7 pt-5 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="font-bold text-indigo-600 hover:text-purple-600 hover:underline transition-colors focus:outline-none cursor-pointer"
                    >
                      Log in to your workspace
                    </button>
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-200 bg-white/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© 2026 EMS. All rights reserved.</div>
          <div className="flex gap-6">
            <span className="hover:text-indigo-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-indigo-600 cursor-pointer">Terms of Service</span>
            <span className="hover:text-indigo-600 cursor-pointer">Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Signup
