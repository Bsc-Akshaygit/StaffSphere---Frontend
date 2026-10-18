import { useState } from 'react'

function Login({ onBack, onNavigateToSignup, onLoginSuccess, sessionExpiredMessage }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

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
    if (!form.email.trim()) {
      errs.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address'
    }

    if (!form.password) {
      errs.password = 'Password is required'
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
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
      const response = await fetch('http://localhost:8080/platform/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.error || `Login failed with status: ${response.status}`)
      }

      // Extract tokens returned from endpoint
      const accessToken =
        data.accessToken ||
        data.access_token ||
        data.token ||
        data.data?.accessToken ||
        data.data?.access_token ||
        data.data?.token

      const refreshToken =
        data.refreshToken ||
        data.refresh_token ||
        data.data?.refreshToken ||
        data.data?.refresh_token

      if (accessToken) localStorage.setItem('accessToken', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      setLoginSuccess(true)
      setTimeout(() => {
        setLoginSuccess(false)
        if (onLoginSuccess) {
          onLoginSuccess(data)
        } else if (onBack) {
          onBack()
        }
      }, 1500)
    } catch (err) {
      console.error('Login error:', err)
      setServerError(err.message || 'Unable to connect to server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotSubmit = (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address')
      return
    }

    setForgotError('')
    setForgotSuccess(true)
  }

  const closeForgotModal = () => {
    setForgotModalOpen(false)
    setForgotEmail('')
    setForgotError('')
    setForgotSuccess(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden flex flex-col justify-between relative">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-purple-300/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-pink-300/20 blur-3xl" />
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
              <span className="hidden md:inline text-sm text-slate-500">New here?</span>
              <button
                onClick={onNavigateToSignup}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left / Feature Showcase Column */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200 shadow-sm mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Secure Portal Access</span>
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                Welcome back to your{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  EMS Workspace
                </span>
              </h1>
              
              <p className="text-slate-600 text-base leading-relaxed">
                Log in to monitor workforce attendance, calculate payroll, evaluate team performance, and manage enterprise personnel records with ease.
              </p>
            </div>

            {/* Testimonial / Trust Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-[1.5px] shadow-xl shadow-purple-500/20">
              <div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 text-sm italic mb-4">
                  "EMS transformed our daily HR operations. Managing over 2,000 employees is now completely seamless and fast."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                    AK
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Ananya Kapoor</div>
                    <div className="text-[11px] text-slate-500">Head of People Ops · Apex Inc.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Benefits list */}
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>End-to-end Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>99.9% Uptime Guarantee</span>
              </div>
            </div>
          </div>

          {/* Right / Login Form Card */}
          <div className="lg:col-span-7 w-full max-w-xl mx-auto">
            <div className="relative">
              {/* Outer soft glow border */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-[2.5rem] blur-xl opacity-70" />
              
              <div className="relative rounded-[2rem] bg-white/85 backdrop-blur-2xl ring-1 ring-white/90 shadow-2xl shadow-indigo-500/10 p-7 sm:p-10">
                
                {/* Header inside form */}
                <div className="text-center sm:text-left mb-8">
                  <div className="inline-flex sm:hidden items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/30 mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Account Login
                  </h2>
                  <p className="text-slate-500 text-sm mt-1.5">
                    Enter your registered credentials to access your portal.
                  </p>
                </div>

                {/* Login Success Alert */}
                {loginSuccess && (
                  <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-[1.5px] shadow-lg shadow-emerald-500/20">
                    <div className="rounded-[15px] bg-white/95 backdrop-blur px-4 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Login successful! Redirecting to workspace...
                      </div>
                    </div>
                  </div>
                )}

                {/* Session expired banner — shown when authFetch fires auth:logout */}
                {sessionExpiredMessage && (
                  <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3 text-amber-900 text-sm font-semibold">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">Your session has expired. Please log in again.</div>
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
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
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
                        placeholder="you@company.com"
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50/70 border-2 transition-all duration-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
                          errors.email
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-purple-600 hover:underline transition-colors focus:outline-none cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
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
                        placeholder="Enter your password"
                        className={`w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/70 border-2 transition-all duration-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
                          errors.password
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
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
                    {errors.password && (
                      <p className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={form.rememberMe}
                        onChange={handleChange}
                        className="w-4 h-4 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-600">Keep me logged in</span>
                    </label>
                  </div>

                  {/* Primary Login Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full relative group px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 disabled:opacity-75 overflow-hidden cursor-pointer"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        <>
                          Log In
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
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/90 px-3 text-slate-400 font-semibold tracking-wider">
                      Or sign in with
                    </span>
                  </div>
                </div>

                {/* Social Login Options */}
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

                {/* Switch to Sign Up */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-600">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={onNavigateToSignup}
                      className="font-bold text-indigo-600 hover:text-purple-600 hover:underline transition-colors focus:outline-none cursor-pointer"
                    >
                      Sign up for EMS
                    </button>
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl ring-1 ring-slate-200">
            <button
              onClick={closeForgotModal}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-all focus:outline-none cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Enter your registered work email and we'll send you instructions to reset your password.
            </p>

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>
                    A password reset link has been dispatched to <strong>{forgotEmail}</strong>. Please check your inbox.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                  {forgotError && (
                    <p className="mt-1.5 text-xs text-red-600 font-semibold">{forgotError}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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

export default Login
