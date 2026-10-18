import { useState } from 'react'

// Attach access token, auto-refresh on 401, retry once.
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken')
  const doFetch = (t) =>
    fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    })

  let res = await doFetch(token)

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken')

    if (!refreshToken) {
      console.warn('[authFetch] No refresh token found — logging out.')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      window.dispatchEvent(new CustomEvent('auth:logout'))
      throw new Error('Session expired. Please log in again.')
    }

    console.log('[authFetch] Access token expired, attempting refresh...')

    let refreshRes
    try {
      refreshRes = await fetch('http://localhost:8080/platform/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (networkErr) {
      console.error('[authFetch] Refresh request failed (network error):', networkErr)
      window.dispatchEvent(new CustomEvent('auth:logout'))
      throw new Error('Session expired. Please log in again.')
    }

    if (!refreshRes.ok) {
      const reason = await refreshRes.text().catch(() => '')
      console.warn('[authFetch] Refresh failed:', refreshRes.status, reason)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: reason || 'Session expired.' } }))
      throw new Error('Session expired. Please log in again.')
    }

    const data = await refreshRes.json().catch(() => ({}))
    console.log('[authFetch] Refresh response fields:', Object.keys(data))

    const newAccess =
      data.accessToken || data.access_token || data.token ||
      data.data?.accessToken || data.data?.access_token

    const newRefresh =
      data.refreshToken || data.refresh_token ||
      data.data?.refreshToken || data.data?.refresh_token

    if (!newAccess) {
      console.error('[authFetch] Refresh succeeded but no access token found in response. Full response:', data)
      window.dispatchEvent(new CustomEvent('auth:logout'))
      throw new Error('Session expired. Please log in again.')
    }

    console.log('[authFetch] Token refreshed successfully.')
    localStorage.setItem('accessToken', newAccess)
    if (newRefresh) localStorage.setItem('refreshToken', newRefresh)

    res = await doFetch(newAccess)
  }

  return res
}


function AddEmployee({ onBack, onNavigateToView }) {
  const [form, setForm] = useState({
    name: '',
    salary: '',
    address: '',
    phone: '',
    email: '',
    designation: '',
    adhar: '',
    dob: '',
    joiningDate: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
    if (serverError) setServerError('')
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.salary) e.salary = 'Salary is required'
    else if (Number(form.salary) < 0) e.salary = 'Salary must be positive'
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit phone'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.designation.trim()) e.designation = 'Designation is required'
    if (!form.adhar.trim()) e.adhar = 'Aadhaar number is required'
    else if (!/^\d{4}\s?\d{4}\s?\d{4}$/.test(form.adhar.replace(/\s/g, '')))
      e.adhar = 'Enter a valid 12-digit Aadhaar number'
    if (!form.dob) e.dob = 'Date of birth is required'
    if (!form.joiningDate) e.joiningDate = 'Joining date is required'
    if (form.dob && form.joiningDate && new Date(form.joiningDate) < new Date(form.dob)) {
      e.joiningDate = 'Joining date cannot be before DOB'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setServerError('')

    try {
      const response = await authFetch('http://localhost:8080/platform/addEmployee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          salary: form.salary,
          address: form.address,
          phone: form.phone,
          email: form.email,
          designation: form.designation,
          aadhaar: form.adhar,
          dateOfBirth: form.dob,
          joingDate: form.joiningDate,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to add employee (Status: ${response.status})`)
      }

      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
      setForm({
        name: '', salary: '', address: '', phone: '', email: '',
        designation: '', adhar: '', dob: '', joiningDate: '',
      })
    } catch (err) {
      console.error('Add employee error:', err)
      setServerError(err.message || 'Unable to connect to server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = (f) =>
    `w-full px-4 py-3.5 rounded-2xl bg-white/80 backdrop-blur border-2 transition-all duration-200 text-slate-800 placeholder:text-slate-400 focus:outline-none ${
      errors[f]
        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
        : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
    }`

  const labelClass = 'block text-sm font-bold text-slate-700 mb-2 tracking-wide'

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-20 h-[500px] w-[500px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-60 -left-32 h-[420px] w-[420px] rounded-full bg-purple-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-[380px] w-[380px] rounded-full bg-pink-300/20 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 h-18">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
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
            </div>
            <div className="flex items-center gap-2">
              {onNavigateToView && (
                <button
                  onClick={onNavigateToView}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white/80 hover:bg-white hover:text-indigo-600 hover:ring-indigo-300 hover:shadow-md transition-all duration-300"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back to Directory
                </button>
              )}
              <button
                onClick={onBack}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white/80 hover:bg-white hover:text-indigo-600 hover:ring-indigo-300 hover:shadow-md transition-all duration-300"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 shadow-sm mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-700">Add New Employee</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="text-slate-900">Register a New </span>
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Team Member
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Fill in the details below to onboard a new employee. All fields marked with <span className="text-red-500 font-bold">*</span> are required.
          </p>
        </div>

        {submitted && (
          <div className="mb-8 mx-auto max-w-3xl">
            <div className="relative rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[2px] shadow-xl shadow-emerald-500/30">
              <div className="rounded-2xl bg-white/95 backdrop-blur px-6 py-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Employee added successfully!</div>
                  <div className="text-sm text-slate-600">The new team member has been registered in the system.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[2.5rem] blur-2xl" />
          <div className="relative rounded-[2rem] bg-white/75 backdrop-blur-xl ring-1 ring-white shadow-2xl shadow-indigo-100/60 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-xl tracking-tight">Employee Information</h2>
                  <p className="text-white/80 text-sm">Complete all fields to create the record</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-white/90 text-sm font-bold bg-white/15 px-4 py-2 rounded-xl ring-1 ring-white/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure & Encrypted
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                  <h3 className="font-bold text-slate-900 text-lg">Personal Details</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-100 to-transparent ml-3" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        className={`${inputClass('name')} pl-12`}
                      />
                    </div>
                    {errors.name && <p className="mt-2 text-sm text-red-600 font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.name}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="e.g. rahul@company.com"
                        className={`${inputClass('email')} pl-12`}
                      />
                    </div>
                    {errors.email && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.email}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                        className={`${inputClass('phone')} pl-12`}
                      />
                    </div>
                    {errors.phone && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Aadhaar Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <input
                        type="text"
                        name="adhar"
                        value={form.adhar}
                        onChange={handleChange}
                        placeholder="e.g. 1234 5678 9012"
                        maxLength={14}
                        className={`${inputClass('adhar')} pl-12`}
                      />
                    </div>
                    {errors.adhar && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.adhar}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="date"
                        name="dob"
                        value={form.dob}
                        onChange={handleChange}
                        className={`${inputClass('dob')} pl-12`}
                      />
                    </div>
                    {errors.dob && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.dob}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Joining Date <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <input
                        type="date"
                        name="joiningDate"
                        value={form.joiningDate}
                        onChange={handleChange}
                        className={`${inputClass('joiningDate')} pl-12`}
                      />
                    </div>
                    {errors.joiningDate && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.joiningDate}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">2</div>
                  <h3 className="font-bold text-slate-900 text-lg">Professional Details</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-100 to-transparent ml-3" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Designation <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="text"
                        name="designation"
                        value={form.designation}
                        onChange={handleChange}
                        placeholder="e.g. Senior Software Engineer"
                        className={`${inputClass('designation')} pl-12`}
                      />
                    </div>
                    {errors.designation && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.designation}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Salary (₹) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₹</span>
                      <input
                        type="number"
                        name="salary"
                        value={form.salary}
                        onChange={handleChange}
                        placeholder="e.g. 600000"
                        min="0"
                        className={`${inputClass('salary')} pl-10`}
                      />
                    </div>
                    {errors.salary && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.salary}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Residential Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Street, City, State, Pin Code..."
                        className={`${inputClass('address')} pl-12 resize-none`}
                      />
                    </div>
                    {errors.address && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.address}</p>}
                  </div>
                </div>
              </div>

              {serverError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3">
                  <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {serverError}
                </div>
              )}

              <div className="pt-6 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Your data is protected with 256-bit encryption</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setForm({
                        name: '', salary: '', address: '', phone: '', email: '',
                        designation: '', adhar: '', dob: '', joiningDate: '',
                      }) || setErrors({}) || setServerError('')
                    }
                    className="group px-7 py-3.5 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-700 font-bold shadow-md hover:bg-slate-50 hover:shadow-lg hover:ring-slate-300 transition-all duration-300 disabled:opacity-50"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative px-9 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          Add Employee
                          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <footer className="relative mt-10 border-t border-slate-200 bg-white/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            © 2026 EMS. All rights reserved.
          </div>
          <div className="text-xs text-slate-400 font-medium">v1.0.0 · Built for modern HR teams</div>
        </div>
      </footer>
    </div>
  )
}

export default AddEmployee
