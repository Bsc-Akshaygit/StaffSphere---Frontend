import { useState, useMemo, useEffect, useCallback } from 'react'

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

const formatCurrency = (val) => {
  if (!val) return '₹0'
  const num = Number(String(val).replace(/[^0-9.-]+/g, ''))
  if (isNaN(num)) return val
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

// Simple bar chart rendered with divs — no external library needed
function BarChart({ data, colorClass = 'bg-indigo-500' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">
            {formatCurrency(d.value)}
          </span>
          <div
            className={`w-full rounded-t-lg ${colorClass} transition-all duration-700`}
            style={{ height: `${Math.max((d.value / max) * 96, 6)}px` }}
          />
          <span
            className="text-[9px] text-slate-500 font-semibold truncate w-full text-center"
            title={d.label}
          >
            {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// Simple horizontal bar chart for designation breakdown
function HorizBar({ label, value, max, color = 'bg-indigo-500', count }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 2
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-600 w-32 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-6 text-right shrink-0">{count}</span>
    </div>
  )
}

// Donut-style ring (pure SVG, no library)
function DonutChart({ segments, size = 120, strokeWidth = 18 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1

  let offset = 0
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f97316', '#06b6d4', '#8b5cf6', '#f59e0b']

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const gap = circ - dash
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

function StatCard({ icon, label, value, sub, gradient, iconBg }) {
  return (
    <div
      className={`relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br ${gradient} text-white shadow-xl`}
    >
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />
      <div className="relative z-10 flex flex-col gap-3">
        <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-3xl font-extrabold leading-none">{value}</div>
          {sub && <div className="text-white/60 text-xs font-medium mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ onBack, onNavigateToAdd, onNavigateToUpdate, onLogout }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'employees'

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('http://localhost:8080/platform/viewEmployee')
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`)
      const data = await res.json()

      let rawList = []
      if (Array.isArray(data)) rawList = data
      else if (data?.employees) rawList = data.employees
      else if (data?.data) rawList = data.data
      else if (typeof data === 'object') rawList = Object.values(data).find(Array.isArray) || []

      const normalized = rawList.map((emp, index) => ({
        id: emp.id || emp.empId || emp._id || index + 1,
        name: emp.name || emp.empName || emp.employeeName || 'Unknown',
        email: emp.email || emp.empEmail || '—',
        designation: emp.designation || emp.role || emp.empDesignation || 'Employee',
        salary: Number(emp.salary || emp.empSalary || 0),
        phone: emp.phone || emp.mobile || emp.phoneNumber || 'N/A',
        adhar: emp.adhar || emp.aadhaar || 'N/A',
        address: emp.address || emp.empAddress || 'N/A',
        dob: emp.dob || emp.dateOfBirth || '',
        joiningDate: emp.joiningDate || emp.doj || emp.dateOfJoining || '',
        department: emp.department || emp.dept || emp.designation || 'General',
        status: emp.status || 'Active',
        avatar: getAvatarInitials(emp.name || emp.empName),
        color: getGradientByIndex(index),
      }))

      setEmployees(normalized)
    } catch (err) {
      setError(err.message || 'Failed to connect to server.')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // ── Derived stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = employees.length
    const totalSalary = employees.reduce((s, e) => s + e.salary, 0)
    const avgSalary = total > 0 ? Math.round(totalSalary / total) : 0
    const maxSalary = total > 0 ? Math.max(...employees.map((e) => e.salary)) : 0
    const minSalary = total > 0 ? Math.min(...employees.map((e) => e.salary)) : 0
    const roles = new Set(employees.map((e) => e.designation)).size

    // Designation breakdown (top 7)
    const desgMap = {}
    employees.forEach((e) => {
      desgMap[e.designation] = (desgMap[e.designation] || 0) + 1
    })
    const designationData = Object.entries(desgMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([label, count]) => ({ label, count, value: count }))

    // Salary bucket distribution
    const buckets = [
      { label: '< 3L', min: 0, max: 300000 },
      { label: '3–6L', min: 300000, max: 600000 },
      { label: '6–10L', min: 600000, max: 1000000 },
      { label: '10–15L', min: 1000000, max: 1500000 },
      { label: '> 15L', min: 1500000, max: Infinity },
    ]
    const salaryDist = buckets.map((b) => ({
      label: b.label,
      value: employees.filter((e) => e.salary >= b.min && e.salary < b.max).length,
    }))

    // Top earners (top 5)
    const topEarners = [...employees]
      .sort((a, b) => b.salary - a.salary)
      .slice(0, 5)

    // Recent hires (last 5 by joiningDate)
    const recentHires = [...employees]
      .filter((e) => e.joiningDate)
      .sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate))
      .slice(0, 5)

    return {
      total,
      totalSalary,
      avgSalary,
      maxSalary,
      minSalary,
      roles,
      designationData,
      salaryDist,
      topEarners,
      recentHires,
    }
  }, [employees])

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees
    const q = searchTerm.toLowerCase()
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.phone.includes(q)
    )
  }, [employees, searchTerm])

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Ambient glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-purple-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-pink-300/15 blur-3xl" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 h-18">
            {/* Logo */}
            <button onClick={onBack} className="flex items-center gap-3 group focus:outline-none cursor-pointer">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
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
            </button>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchEmployees}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {onNavigateToAdd && (
                <button
                  onClick={onNavigateToAdd}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Employee
                </button>
              )}

              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              <button
                onClick={onLogout || onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time overview of your entire workforce.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center bg-white rounded-2xl ring-1 ring-slate-200 p-1 shadow-sm">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'employees', label: 'All Employees' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-3xl bg-rose-50 border border-rose-200 p-5 flex items-center justify-between gap-4 text-rose-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">Connection Error</div>
                <div className="text-xs text-rose-700 mt-0.5">{error}</div>
              </div>
            </div>
            <button
              onClick={fetchEmployees}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 bg-white/70 backdrop-blur rounded-3xl border border-white">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-700">Loading dashboard data…</p>
            <p className="text-xs text-slate-400 mt-1">Please wait</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════ */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-8">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                gradient="from-indigo-500 to-purple-600"
                iconBg="bg-white/20"
                label="Total Employees"
                value={stats.total}
                sub="Registered in database"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <StatCard
                gradient="from-pink-500 to-rose-600"
                iconBg="bg-white/20"
                label="Monthly Payroll"
                value={formatCurrency(stats.totalSalary)}
                sub="Total monthly expenditure"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                gradient="from-emerald-500 to-teal-600"
                iconBg="bg-white/20"
                label="Average Salary"
                value={formatCurrency(stats.avgSalary)}
                sub="Per employee"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <StatCard
                gradient="from-orange-500 to-red-500"
                iconBg="bg-white/20"
                label="Active Roles"
                value={stats.roles}
                sub="Distinct designations"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Salary Distribution Bar Chart */}
              <div className="lg:col-span-2 rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Salary Distribution</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Headcount by salary bracket</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                {employees.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    No data available
                  </div>
                ) : (
                  <BarChart
                    data={stats.salaryDist.map((b) => ({ label: b.label, value: b.value }))}
                    colorClass="bg-gradient-to-t from-indigo-600 to-purple-400"
                  />
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {stats.salaryDist.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 opacity-80" style={{ opacity: 0.4 + i * 0.15 }} />
                      <span className="text-[10px] font-semibold text-slate-500">{b.label}: {b.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Designation Donut */}
              <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">By Role</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Designation breakdown</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                </div>

                {employees.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    No data available
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center my-2">
                      <div className="relative">
                        <DonutChart
                          segments={stats.designationData.map((d) => ({
                            label: d.label,
                            value: d.count,
                          }))}
                          size={120}
                          strokeWidth={20}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Total</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {stats.designationData.slice(0, 5).map((d, i) => {
                        const colors = ['bg-indigo-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500', 'bg-cyan-500']
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${colors[i]}`} />
                              <span className="text-slate-600 font-medium truncate max-w-[120px]">{d.label}</span>
                            </div>
                            <span className="font-bold text-slate-800">{d.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top Earners */}
              <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Top Earners</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Highest paid employees</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>

                {stats.topEarners.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-semibold">No data</div>
                ) : (
                  <div className="space-y-3">
                    {stats.topEarners.map((emp, i) => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                        <span className={`text-xs font-extrabold w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${emp.color} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md`}>
                          {emp.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{emp.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{emp.designation}</div>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 shrink-0">
                          {formatCurrency(emp.salary)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Designation Horizontal Bars */}
              <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Headcount by Role</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Distribution across designations</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
                    </svg>
                  </div>
                </div>

                {stats.designationData.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-semibold">No data</div>
                ) : (
                  <div className="space-y-3">
                    {stats.designationData.map((d, i) => {
                      const barColors = [
                        'bg-indigo-500', 'bg-pink-500', 'bg-emerald-500',
                        'bg-orange-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500',
                      ]
                      return (
                        <HorizBar
                          key={i}
                          label={d.label}
                          value={d.count}
                          max={stats.designationData[0]?.count || 1}
                          color={barColors[i % barColors.length]}
                          count={d.count}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Hires */}
            {stats.recentHires.length > 0 && (
              <div className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Recent Hires</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Latest additions to the team</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    {stats.recentHires.length} newest
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-3 pr-4">Employee</th>
                        <th className="pb-3 pr-4">Designation</th>
                        <th className="pb-3 pr-4">Salary</th>
                        <th className="pb-3">Joining Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.recentHires.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${emp.color} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow`}>
                                {emp.avatar}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{emp.name}</div>
                                <div className="text-[11px] text-slate-400">{emp.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                              {emp.designation}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-bold text-slate-900">{formatCurrency(emp.salary)}</td>
                          <td className="py-3 text-slate-600 text-xs font-medium">{emp.joiningDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            ALL EMPLOYEES TAB
        ══════════════════════════════════════════════════ */}
        {!loading && activeTab === 'employees' && (
          <div className="space-y-6">

            {/* Search bar */}
            <div className="relative max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, role, phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm"
              />
            </div>

            {/* Employees grid */}
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-16 bg-white/70 rounded-3xl border border-dashed border-slate-300">
                <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {searchTerm ? 'No matching employees' : 'No employees found'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm ? 'Try a different search term.' : 'Add employees to see them here.'}
                </p>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-500 font-semibold px-1">
                  Showing <strong className="text-slate-800">{filteredEmployees.length}</strong> of{' '}
                  <strong className="text-slate-800">{employees.length}</strong> employees
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="rounded-3xl bg-white/90 backdrop-blur ring-1 ring-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      {/* Card header gradient strip */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${emp.color}`} />

                      <div className="p-5">
                        {/* Avatar + badge */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${emp.color} text-white font-bold text-sm flex items-center justify-center shadow-lg`}>
                            {emp.avatar}
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {emp.status}
                          </span>
                        </div>

                        {/* Name & role */}
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{emp.name}</h3>
                        <p className="text-[11px] text-indigo-600 font-semibold mb-1">{emp.designation}</p>
                        <p className="text-[11px] text-slate-400 truncate mb-3">{emp.email}</p>

                        {/* Stats */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-medium">Salary</span>
                            <span className="text-xs font-extrabold text-slate-900">{formatCurrency(emp.salary)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-medium">Phone</span>
                            <span className="text-xs font-semibold text-slate-700">{emp.phone}</span>
                          </div>
                          {emp.joiningDate && (
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400 font-medium">Joined</span>
                              <span className="text-xs font-semibold text-slate-700">{emp.joiningDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-xl mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© 2026 StaffSphere Employee Tracker.</div>
          <div className="flex gap-6">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Dashboard
