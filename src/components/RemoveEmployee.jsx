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


function RemoveEmployee({ onBack, onNavigateToView }) {
  const [email, setEmail] = useState('')
  const [aadhaar, setAadhaar] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleAadhaarChange = (e) => {
    // Only allow digits, max 12
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
    setAadhaar(digits)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    const trimmedEmail = email.trim()
    const trimmedAadhaar = aadhaar.trim()

    if (!trimmedEmail) {
      setError('Please enter the employee email.')
      return
    }
    if (!trimmedAadhaar || trimmedAadhaar.length < 12) {
      setError('Please enter a valid 12-digit Aadhaar number.')
      return
    }

    setLoading(true)

    try {
      const response = await authFetch(
        'http://localhost:8080/platform/deleteEmployee',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, aadhaar: trimmedAadhaar }),
        }
      )

      // Backend returns plain text
      const text = await response.text().catch(() => '')

      if (!response.ok) {
        throw new Error(text || `Delete failed (Status: ${response.status})`)
      }

      setSuccess(text || 'Employee deleted successfully.')
      setEmail('')
      setAadhaar('')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Ambient glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[400px] w-[400px] rounded-full bg-pink-300/15 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-slate-900">Remove Employee</span>
                <span className="text-[11px] text-slate-400 font-medium">Delete a record from the database</span>
              </div>
            </div>

            {/* Back buttons */}
            <div className="flex items-center gap-2">
              {onNavigateToView && (
                <button
                  onClick={onNavigateToView}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 ring-1 ring-slate-200 bg-white hover:text-indigo-600 hover:ring-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back to Directory
                </button>
              )}
              <button
                onClick={onBack}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 ring-1 ring-slate-200 bg-white hover:text-slate-900 hover:ring-slate-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl ring-1 ring-slate-100 overflow-hidden">
            {/* Red top strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-pink-600" />

            <div className="p-8">
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Delete Employee</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the employee's email and Aadhaar number to permanently remove them from the database.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@example.com"
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-400 transition-all"
                  />
                </div>

                {/* Aadhaar */}
                <div>
                  <label htmlFor="aadhaar" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Aadhaar Number
                  </label>
                  <input
                    id="aadhaar"
                    type="text"
                    inputMode="numeric"
                    value={aadhaar}
                    onChange={handleAadhaarChange}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-100 focus:border-rose-400 transition-all font-mono tracking-widest"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    {aadhaar.length}/12 digits entered
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
                    <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs font-semibold">{error}</span>
                  </div>
                )}

                {/* Success message */}
                {success && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-semibold">{success}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/35 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Employee
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

          {/* Warning note */}
          <p className="text-center text-xs text-slate-400 mt-5 font-medium">
            ⚠️ This action is permanent and cannot be undone.
          </p>
        </div>
      </main>
    </div>
  )
}

export default RemoveEmployee
