import { useCallback, useEffect, useMemo, useState } from 'react'

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


const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-500 to-yellow-600',
]

function getAvatarInitials(name) {
  if (!name) return 'EM'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getGradientByIndex(index) {
  return GRADIENTS[index % GRADIENTS.length]
}

function UpdateEmployee({ onBack, onNavigateToView }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  // Fetch employees from the database
  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await authFetch('http://localhost:8080/platform/viewEmployee')

      if (!response.ok) {
        throw new Error(`Failed to load database records (Status: ${response.status})`)
      }

      const data = await response.json()

      let rawList = []
      if (Array.isArray(data)) {
        rawList = data
      } else if (data && Array.isArray(data.employees)) {
        rawList = data.employees
      } else if (data && Array.isArray(data.data)) {
        rawList = data.data
      } else if (data && typeof data === 'object') {
        rawList = Object.values(data).find(Array.isArray) || []
      }

      // Normalize database records for consistent display
      const normalized = rawList.map((emp, index) => ({
        id: emp.id || emp.empId || emp._id || index + 1,
        name: emp.name || emp.empName || emp.employeeName || 'Unknown Employee',
        email: emp.email || emp.empEmail || 'No email provided',
        designation: emp.designation || emp.role || emp.empDesignation || 'Employee',
        salary: emp.salary || emp.empSalary || '0',
        phone: emp.phone || emp.mobile || emp.phoneNumber || emp.empPhone || 'N/A',
        adhar: emp.adhar || emp.aadhaar || emp.adharNumber || emp.empAdhar || 'N/A',
        address: emp.address || emp.empAddress || 'N/A',
        dob: emp.dob || emp.dateOfBirth || '',
        joiningDate: emp.joiningDate || emp.doj || emp.dateOfJoining || '',
        avatar: emp.avatar || getAvatarInitials(emp.name || emp.empName),
        color: emp.color || getGradientByIndex(index),
      }))

      setEmployees(normalized)
    } catch (err) {
      console.error('Database fetch error:', err)
      setError(
        err.message || 'Unable to connect to database at http://localhost:8080/platform/viewEmployee'
      )
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  const startEditing = (emp) => {
    setEditing(emp.id)
    setForm({
      ...emp,
      name:        String(emp.name        || ''),
      email:       String(emp.email       || ''),
      phone:       String(emp.phone       || ''),
      address:     String(emp.address     || ''),
      designation: String(emp.designation || ''),
      adhar:       String(emp.adhar       || ''),
      salary:      String(emp.salary      || ''),
      dob:         String(emp.dob         || ''),
      joiningDate: String(emp.joiningDate || ''),
    })
    setErrors({})
  }

  const cancelEditing = () => {
    setEditing(null)
    setForm({})
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!String(form.name || '').trim()) e.name = 'Name is required'
    if (!form.salary) e.salary = 'Salary is required'
    else if (Number(form.salary) < 0) e.salary = 'Salary must be positive'
    if (!String(form.address || '').trim()) e.address = 'Address is required'
    if (!String(form.phone || '').trim()) e.phone = 'Phone number is required'
    else if (!/^\d{10}$/.test(String(form.phone).replace(/\D/g, '')))
      e.phone = 'Enter a valid 10-digit phone'
    if (!String(form.email || '').trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email'
    if (!String(form.designation || '').trim()) e.designation = 'Designation is required'
    if (!String(form.adhar || '').trim()) e.adhar = 'Aadhaar number is required'
    else if (!/^\d{4}\s?\d{4}\s?\d{4}$/.test(String(form.adhar).replace(/\s/g, '')))
      e.adhar = 'Enter a valid 12-digit Aadhaar number'
    if (!form.dob) e.dob = 'Date of birth is required'
    if (!form.joiningDate) e.joiningDate = 'Joining date is required'
    if (form.dob && form.joiningDate && new Date(form.joiningDate) < new Date(form.dob)) {
      e.joiningDate = 'Joining date cannot be before DOB'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!validate()) return
    setEmployees((prev) =>
      prev.map((x) =>
        x.id === editing
          ? { ...x, ...form, avatar: form.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() }
          : x
      )
    )
    const emp = employees.find((x) => x.id === editing)
    showToast('success', `${emp?.name} record has been updated successfully.`)
    cancelEditing()
  }

  const inputClass = (f) =>
    `w-full px-4 py-3.5 rounded-2xl bg-white/90 backdrop-blur border-2 transition-all duration-200 text-slate-800 placeholder:text-slate-400 focus:outline-none ${
      errors[f]
        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
        : 'border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100'
    }`

  const labelClass = 'block text-sm font-bold text-slate-700 mb-2 tracking-wide'

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-20 h-[500px] w-[500px] rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute top-60 -left-32 h-[420px] w-[420px] rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-indigo-300/20 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 h-18">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-blue-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-blue-600 bg-clip-text text-transparent">
                  Update Employee
                </span>
                <span className="text-[11px] font-medium text-slate-500">StaffSphere Employee Tracker</span>
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
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white/80 hover:bg-white hover:text-amber-600 hover:ring-amber-300 hover:shadow-md transition-all duration-300"
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

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {toast && (
          <div className="fixed top-24 right-6 z-[60]">
            <div className="rounded-2xl p-[2px] shadow-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-blue-500">
              <div className="rounded-2xl bg-white/95 backdrop-blur px-5 py-4 flex items-center gap-3 min-w-[320px]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">Record Updated</div>
                  <div className="text-sm text-slate-600">{toast.text}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-slate-200/80 shadow-sm mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-700">Edit Employee Records</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-blue-600 bg-clip-text text-transparent">
              Update Employee
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Click "Edit" on any employee to modify their details and save changes.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-8 rounded-2xl bg-red-50 ring-1 ring-red-200 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-red-800">Database Connection Error</div>
              <div className="text-sm text-red-600 mt-1">{error}</div>
            </div>
            <button
              onClick={fetchEmployees}
              className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Inline Edit Form */}
        {editing && form && (
          <div className="mb-8">
            <form onSubmit={handleSave} className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-blue-500/15 rounded-[2.5rem] blur-2xl" />
              <div className="relative rounded-[2rem] bg-white/80 backdrop-blur-xl ring-2 ring-amber-200/60 shadow-2xl shadow-amber-100/60 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-blue-500 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${employees.find((x) => x.id === editing)?.color || 'from-slate-500 to-slate-600'} shadow-xl ring-2 ring-white flex items-center justify-center text-white text-xl font-extrabold`}>
                      {employees.find((x) => x.id === editing)?.avatar}
                    </div>
                    <div>
                      <h2 className="text-white font-extrabold text-2xl tracking-tight">Editing Employee</h2>
                      <p className="text-white/90 text-sm font-medium">
                        {employees.find((x) => x.id === editing)?.name} — modify details below and save
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-white/95 text-xs font-bold bg-white/20 px-4 py-2 rounded-xl ring-1 ring-white/30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Mode Active
                  </div>
                </div>

                <div className="p-6 sm:p-10 space-y-8">
                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">1</div>
                      <h3 className="font-bold text-slate-900 text-lg">Personal Details</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-amber-100 to-transparent ml-3" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <input type="text" name="name" value={form.name || ''} onChange={handleChange} className={`${inputClass('name')} pl-12`} />
                        </div>
                        {errors.name && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <input type="email" name="email" value={form.email || ''} onChange={handleChange} className={`${inputClass('email')} pl-12`} />
                        </div>
                        {errors.email && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.email}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <input type="tel" name="phone" value={form.phone || ''} onChange={handleChange} className={`${inputClass('phone')} pl-12`} />
                        </div>
                        {errors.phone && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.phone}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Aadhaar Number <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <input type="text" name="adhar" value={form.adhar || ''} onChange={handleChange} maxLength={14} className={`${inputClass('adhar')} pl-12`} />
                        </div>
                        {errors.adhar && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.adhar}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <input type="date" name="dob" value={form.dob || ''} onChange={handleChange} className={`${inputClass('dob')} pl-12`} />
                        </div>
                        {errors.dob && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.dob}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Joining Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <input type="date" name="joiningDate" value={form.joiningDate || ''} onChange={handleChange} className={`${inputClass('joiningDate')} pl-12`} />
                        </div>
                        {errors.joiningDate && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.joiningDate}</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">2</div>
                      <h3 className="font-bold text-slate-900 text-lg">Professional Details</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-blue-100 to-transparent ml-3" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Designation <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <input type="text" name="designation" value={form.designation || ''} onChange={handleChange} className={`${inputClass('designation')} pl-12`} />
                        </div>
                        {errors.designation && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.designation}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Salary (₹) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₹</span>
                          <input type="number" name="salary" value={form.salary || ''} onChange={handleChange} min="0" className={`${inputClass('salary')} pl-10`} />
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
                          <textarea name="address" value={form.address || ''} onChange={handleChange} rows={4} className={`${inputClass('address')} pl-12 resize-none`} />
                        </div>
                        {errors.address && <p className="mt-2 text-sm text-red-600 font-semibold">{errors.address}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                      <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Changes will overwrite the existing record — review before saving</span>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-7 py-3.5 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-700 font-bold shadow-md hover:bg-slate-50 hover:shadow-lg hover:ring-slate-300 transition-all duration-300"
                      >
                        Cancel Edit
                      </button>
                      <button
                        type="submit"
                        className="group relative px-9 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-blue-500 text-white font-bold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Save Changes
                          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Employee Records List */}
        <div className="relative">
          <div className="rounded-[1.75rem] bg-white/75 backdrop-blur-xl ring-1 ring-white shadow-2xl shadow-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-blue-500 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-xl tracking-tight">Employee Records</h2>
                  <p className="text-white/90 text-sm">
                    {loading
                      ? 'Loading from database...'
                      : `${employees.length} ${employees.length === 1 ? 'record' : 'records'} from database · click Edit to update`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {editing && (
                  <div className="hidden sm:flex items-center gap-2 text-white/95 text-xs font-bold bg-white/20 px-4 py-2 rounded-xl ring-1 ring-white/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Editing {employees.find((x) => x.id === editing)?.name}
                  </div>
                )}
                <button
                  onClick={fetchEmployees}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 ring-1 ring-white/30 transition-all duration-200"
                  title="Refresh from Database"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Loading State */}
              {loading ? (
                <div className="px-8 py-20 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-700">Connecting to database...</p>
                  <p className="text-xs text-slate-400 mt-1">Fetching from http://localhost:8080/platform/viewEmployee</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="px-8 py-20 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-800 mb-3">No employees found</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    There are no employee records in the database yet.
                  </p>
                </div>
              ) : (
                employees.map((e) => {
                  const isEditing = editing === e.id
                  return (
                    <div
                      key={e.id}
                      className={`group relative px-6 sm:px-8 py-5 flex flex-col md:flex-row md:items-center gap-5 transition-all duration-300 hover:bg-gradient-to-r hover:from-amber-50/70 hover:via-white hover:to-blue-50/40 ${
                        isEditing ? 'ring-2 ring-amber-300/60 bg-gradient-to-r from-amber-50/80 via-white to-blue-50/50 shadow-inner' : ''
                      }`}
                    >
                      <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${e.color} flex items-center justify-center text-white font-extrabold text-lg shadow-lg ring-2 ring-white`}>
                        {e.avatar}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Name</div>
                          <div className="font-bold text-slate-900 truncate">{e.name}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</div>
                          <div className="text-sm font-medium text-slate-600 truncate">{e.email}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Aadhaar</div>
                          <div className="text-sm font-semibold text-slate-700 font-mono tracking-wide">{e.adhar}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</div>
                          <div className="text-sm font-medium text-slate-700 truncate">{e.designation}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:ml-4 shrink-0">
                        {isEditing && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-2 rounded-xl ring-1 ring-amber-200">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                            Editing above
                          </span>
                        )}
                        <button
                          onClick={() => startEditing(e)}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all duration-300 flex items-center gap-1.5 ${
                            isEditing
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/40 scale-105'
                              : 'text-amber-700 ring-1 ring-amber-200 bg-amber-50 hover:bg-gradient-to-r hover:from-amber-500 hover:via-orange-500 hover:to-blue-500 hover:text-white hover:ring-transparent hover:shadow-amber-500/30 hover:scale-[1.03] hover:-translate-y-0.5'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {isEditing ? 'Editing…' : 'Edit Employee'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative mt-10 border-t border-slate-200 bg-white/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-blue-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            © 2026 EMS. All rights reserved.
          </div>
          <div className="text-xs text-slate-400 font-medium">v1.0.0 · Secure record updates</div>
        </div>
      </footer>
    </div>
  )
}

export default UpdateEmployee
