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
      // Read body as text — backend sends plain string e.g. "RefreshToken is expired"
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

function ViewEmployee({
  onBack,
  onNavigateToAdd,
  onNavigateToUpdate,
  onNavigateToRemove,
  onNavigateToDashboard,
  onLogout,
}) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDesignation, setSelectedDesignation] = useState('All')
  const [sortBy, setSortBy] = useState('name-asc')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [toast, setToast] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Fetch employees directly and exclusively from the database endpoint
  const fetchEmployeesFromDb = useCallback(async () => {
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
        joiningDate: emp.joiningDate || emp.doj || emp.dateOfJoining || 'N/A',
        department: emp.department || emp.dept || emp.designation || 'General',
        status: emp.status || 'Active',
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
    let ignore = false

    const loadData = async () => {
      try {
        const response = await authFetch('http://localhost:8080/platform/viewEmployee')

        if (!response.ok) {
          throw new Error(`Failed to load database records (Status: ${response.status})`)
        }

        const data = await response.json()
        if (ignore) return

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
          joiningDate: emp.joiningDate || emp.doj || emp.dateOfJoining || 'N/A',
          department: emp.department || emp.dept || emp.designation || 'General',
          status: emp.status || 'Active',
          avatar: emp.avatar || getAvatarInitials(emp.name || emp.empName),
          color: emp.color || getGradientByIndex(index),
        }))

        setEmployees(normalized)
      } catch (err) {
        if (ignore) return
        console.error('Database fetch error:', err)
        setError(
          err.message || 'Unable to connect to database at http://localhost:8080/platform/viewEmployee'
        )
        setEmployees([])
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Get distinct designations from database records
  const designations = useMemo(() => {
    const set = new Set(employees.map((e) => e.designation).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [employees])

  // Filter and sort database employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const query = searchTerm.trim().toLowerCase()
        const matchesSearch =
          !query ||
          emp.name?.toLowerCase().includes(query) ||
          emp.email?.toLowerCase().includes(query) ||
          emp.designation?.toLowerCase().includes(query) ||
          emp.phone?.includes(query) ||
          emp.adhar?.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ||
          emp.address?.toLowerCase().includes(query)

        const matchesDesignation =
          selectedDesignation === 'All' || emp.designation === selectedDesignation

        return matchesSearch && matchesDesignation
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '')
        if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '')
        if (sortBy === 'salary-desc') return Number(b.salary || 0) - Number(a.salary || 0)
        if (sortBy === 'salary-asc') return Number(a.salary || 0) - Number(b.salary || 0)
        if (sortBy === 'joining-recent') {
          return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0)
        }
        return (a.id || 0) - (b.id || 0)
      })
  }, [employees, searchTerm, selectedDesignation, sortBy])

  // Calculate live database statistics
  const stats = useMemo(() => {
    const total = employees.length
    const totalSalary = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0)
    const avgSalary = total > 0 ? Math.round(totalSalary / total) : 0
    const depts = new Set(employees.map((e) => e.department || e.designation)).size
    return {
      total,
      totalSalaryFormatted: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(totalSalary),
      avgSalaryFormatted: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(avgSalary),
      depts,
    }
  }, [employees])

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

  // Delete an employee record from the database, then sync local state.
  const handleDelete = async (id) => {
    const emp = employees.find((e) => e.id === id)
    if (!emp) return

    const aadhaarDigits = String(emp.adhar || '').replace(/\D/g, '')

    if (!emp.email || emp.email === 'No email provided') {
      showToast('Cannot delete: missing email for this record.', 'error')
      setConfirmDeleteId(null)
      return
    }
    if (!aadhaarDigits) {
      showToast('Cannot delete: missing Aadhaar number for this record.', 'error')
      setConfirmDeleteId(null)
      return
    }

    setDeletingId(id)
    setConfirmDeleteId(null)

    try {
      const params = new URLSearchParams({ email: emp.email, aadhaar: aadhaarDigits })
      const response = await authFetch(
        `http://localhost:8080/platform/deleteEmployee?${params.toString()}`,
        { method: 'DELETE' }
      )

      // Backend returns plain text (ResponseEntity<String>), not JSON
      const text = await response.text().catch(() => '')

      if (!response.ok) {
        throw new Error(text || `Delete failed (Status: ${response.status})`)
      }

      setEmployees((prev) => prev.filter((e) => e.id !== id))
      if (selectedEmployee?.id === id) setSelectedEmployee(null)
      showToast(text || `${emp.name} removed successfully.`, 'success')
    } catch (err) {
      console.error('Delete employee error:', err)
      showToast(err.message || 'Unable to delete employee. Please try again.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden flex flex-col justify-between relative">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-purple-300/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-pink-300/20 blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center py-3">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
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
                  <span className="text-[11px] font-medium text-slate-500">Database Workforce Directory</span>
                </div>
              </button>
            </div>

            {/* Actions / Links */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchEmployeesFromDb}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Refresh from Database"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {onNavigateToDashboard && (
                <button
                  onClick={onNavigateToDashboard}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}

              {onNavigateToAdd && (
                <button
                  onClick={onNavigateToAdd}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Employee
                </button>
              )}

              {onNavigateToUpdate && (
                <button
                  onClick={onNavigateToUpdate}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update
                </button>
              )}

              {onNavigateToRemove && (
                <button
                  onClick={onNavigateToRemove}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 bg-white ring-1 ring-slate-200 hover:ring-rose-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Employee
                </button>
              )}


              <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

              <button
                onClick={onLogout || onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-105 transition-all cursor-pointer"
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* Toast alert */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div className="px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 text-xs font-bold border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {toast.message}
            </div>
          </div>
        )}

        {/* Database Error Banner */}
        {error && (
          <div className="mb-6 rounded-3xl bg-rose-50 border border-rose-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">Database Connection Alert</div>
                <div className="text-xs text-rose-700 mt-0.5">{error}</div>
              </div>
            </div>
            <button
              onClick={fetchEmployeesFromDb}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 cursor-pointer"
            >
              Retry Endpoint
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Source: http://localhost:8080/platform/viewEmployee
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Employee Directory
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Live records loaded directly from your enterprise database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToAdd && (
              <button
                onClick={onNavigateToAdd}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add New Employee
              </button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-indigo-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Database Records
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{stats.total}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified in database
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-purple-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Total Payroll
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalSalaryFormatted}</div>
            <div className="text-[11px] text-purple-600 font-semibold mt-1">
              Monthly expenditure
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-pink-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Average Salary
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.avgSalaryFormatted}</div>
            <div className="text-[11px] text-indigo-600 font-semibold mt-1">
              Across database workforce
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-emerald-500/5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Active Roles
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{Math.max(0, designations.length - 1)}</div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">
              Distinct designations
            </div>
          </div>
        </div>

        {/* Filter and Search Controls Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-500/5 mb-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

            {/* Filter Dropdowns & View Switch */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Designation Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 cursor-pointer"
                >
                  {designations.map((d) => (
                    <option key={d} value={d}>
                      {d === 'All' ? 'All Designations' : d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="name-asc">Sort: Name (A-Z)</option>
                  <option value="name-desc">Sort: Name (Z-A)</option>
                  <option value="salary-desc">Sort: Salary (Highest)</option>
                  <option value="salary-asc">Sort: Salary (Lowest)</option>
                  <option value="joining-recent">Sort: Joining Date (Newest)</option>
                </select>
              </div>

              {/* View Mode Toggle (Table / Grid) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                  aria-label="Table View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card Grid View"
                  aria-label="Card Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="py-16 text-center text-slate-500 bg-white/60 backdrop-blur rounded-3xl border border-white">
            <div className="inline-block animate-spin w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full mb-3" />
            <p className="text-sm font-bold text-slate-700">Connecting to database...</p>
            <p className="text-xs text-slate-400 mt-1">Querying http://localhost:8080/platform/viewEmployee</p>
          </div>
        )}

        {/* Empty state (No database records found) */}
        {!loading && filteredEmployees.length === 0 && (
          <div className="text-center py-16 px-4 bg-white/70 backdrop-blur rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {searchTerm ? 'No matching employee records' : 'No employees in database'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {searchTerm
                ? `No employee matches the search term "${searchTerm}". Try resetting your search filters.`
                : 'Your database currently has 0 employee records. Add your first employee to populate this directory.'}
            </p>
            <div className="flex justify-center gap-3">
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedDesignation('All')
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              {onNavigateToAdd && (
                <button
                  onClick={onNavigateToAdd}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:opacity-95 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  + Add Employee
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table View */}
        {!loading && filteredEmployees.length > 0 && viewMode === 'table' && (
          <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-500/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Designation</th>
                    <th className="py-4 px-6">Contact & Aadhaar</th>
                    <th className="py-4 px-6">Salary</th>
                    <th className="py-4 px-6">Joining Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${
                              emp.color || 'from-indigo-500 to-purple-600'
                            } text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0`}
                          >
                            {emp.avatar}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-xs text-slate-400">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {emp.designation}
                        </span>
                      </td>

                      {/* Contact & Aadhaar */}
                      <td className="py-4 px-6 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{emp.phone}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          UID: {emp.adhar}
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-900">
                          {formatCurrency(emp.salary)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ annum</span>
                      </td>

                      {/* Joining Date */}
                      <td className="py-4 px-6 text-xs text-slate-600">
                        <div className="font-medium">{emp.joiningDate}</div>
                        <div className="text-[11px] text-slate-400">{emp.department}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View Full Profile"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Inline delete confirm */}
                          {confirmDeleteId === emp.id ? (
                            <>
                              <span className="text-[11px] font-bold text-rose-600 hidden sm:inline">Sure?</span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(emp.id)}
                                disabled={deletingId === emp.id}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {deletingId === emp.id ? '…' : 'Yes'}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(emp.id)}
                              disabled={deletingId === emp.id}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Employee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Count */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div>
                Showing <strong className="text-slate-900">{filteredEmployees.length}</strong> of{' '}
                <strong className="text-slate-900">{employees.length}</strong> database records
              </div>
              <div className="text-[11px] text-slate-400">
                Data loaded live from http://localhost:8080/platform/viewEmployee
              </div>
            </div>
          </div>
        )}

        {/* Card Grid View */}
        {!loading && filteredEmployees.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className="group relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white p-6 shadow-xl shadow-indigo-500/5 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
                        emp.color || 'from-indigo-500 to-purple-600'
                      } text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-indigo-500/20`}
                    >
                      {emp.avatar}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {emp.designation}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">{emp.email}</p>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-semibold text-slate-800">{emp.phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">Compensation:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(emp.salary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">Joined:</span>
                      <span className="font-medium text-slate-700">{emp.joiningDate}</span>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="text-xs font-bold text-indigo-600 hover:text-purple-600 flex items-center gap-1 cursor-pointer"
                  >
                    View Details
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {confirmDeleteId === emp.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-rose-600">Sure?</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        disabled={deletingId === emp.id}
                        className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {deletingId === emp.id ? '…' : 'Yes'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(emp.id)}
                      disabled={deletingId === emp.id}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-7 sm:p-9 shadow-2xl ring-1 ring-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedEmployee(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all focus:outline-none cursor-pointer"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-5 mb-8">
              <div
                className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${
                  selectedEmployee.color || 'from-indigo-500 to-purple-600'
                } text-white font-bold text-xl flex items-center justify-center shadow-xl shadow-indigo-500/25 shrink-0`}
              >
                {selectedEmployee.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {selectedEmployee.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {selectedEmployee.status || 'Active'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-indigo-600">
                  {selectedEmployee.designation}
                </p>
                <p className="text-xs text-slate-400">{selectedEmployee.email}</p>
              </div>
            </div>

            {/* Profile Information Sections */}
            <div className="space-y-6">
              
              {/* Employment Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Employment Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Annual Salary</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCurrency(selectedEmployee.salary)}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Joining Date</span>
                    <span className="text-base font-bold text-slate-900">
                      {selectedEmployee.joiningDate}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Department</span>
                    <span className="text-base font-bold text-slate-900">
                      {selectedEmployee.department}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">Employment Status</span>
                    <span className="text-base font-bold text-slate-900">
                      {selectedEmployee.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Personal & Verification Details
                </h4>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Aadhaar (UID) Number</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {selectedEmployee.adhar}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Phone Number</span>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedEmployee.phone}
                    </span>
                  </div>
                  {selectedEmployee.dob && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400">Date of Birth</span>
                      <span className="text-xs font-bold text-slate-900">
                        {selectedEmployee.dob}
                      </span>
                    </div>
                  )}
                  {selectedEmployee.address && selectedEmployee.address !== 'N/A' && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-xs text-slate-400 block mb-1">Residential Address</span>
                      <span className="text-xs font-medium text-slate-800 leading-relaxed">
                        {selectedEmployee.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
              {confirmDeleteId === selectedEmployee.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600">Delete this record?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedEmployee.id)}
                    disabled={deletingId === selectedEmployee.id}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {deletingId === selectedEmployee.id ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting…
                      </>
                    ) : 'Yes, Delete'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedEmployee.id)}
                  disabled={deletingId === selectedEmployee.id}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Record
                </button>
              )}

              <div className="flex gap-2">
                {onNavigateToUpdate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(null)
                      onNavigateToUpdate()
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Edit Employee
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative border-t border-slate-200 bg-white/60 backdrop-blur-xl mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© 2026 EMS. Enterprise Workforce Platform.</div>
          <div className="flex gap-6">
            <span className="hover:text-indigo-600 cursor-pointer">Directory Policy</span>
            <span className="hover:text-indigo-600 cursor-pointer">Security Compliance</span>
            <span className="hover:text-indigo-600 cursor-pointer">Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ViewEmployee
