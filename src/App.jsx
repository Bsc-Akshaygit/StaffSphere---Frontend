import { useState, useEffect } from 'react'
import Home from './components/Home'
import About from './components/About'
import Login from './components/Login'
import Signup from './components/Signup'
import AddEmployee from './components/AddEmployee'
import RemoveEmployee from './components/RemoveEmployee'
import UpdateEmployee from './components/UpdateEmployee'
import ViewEmployee from './components/viewEmployee'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const isLoggedIn = Boolean(localStorage.getItem('accessToken'))
  const [page, setPage] = useState(isLoggedIn ? 'viewEmployee' : 'home')
  const [sessionMsg, setSessionMsg] = useState('')

  const goHome = () => {
    const loggedIn = Boolean(localStorage.getItem('accessToken'))
    setPage(loggedIn ? 'viewEmployee' : 'home')
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setSessionMsg('')
    setPage('login')
  }

  // Auto-redirect to login when authFetch fires auth:logout (refresh token expired/deleted)
  useEffect(() => {
    const handler = (e) => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      const reason = e.detail?.reason || 'Your session expired. Please log in again.'
      setSessionMsg(reason)
      setPage('login')
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  if (page === 'about') {
    return (
      <About
        onBack={() => setPage('home')}
        onLogin={() => setPage('login')}
        onSignup={() => setPage('signup')}
        onViewEmployees={() => setPage('viewEmployee')}
      />
    )
  }

  if (page === 'login') {
    return (
      <Login
        onBack={goHome}
        onNavigateToSignup={() => setPage('signup')}
        onLoginSuccess={() => { setSessionMsg(''); setPage('viewEmployee') }}
        sessionExpiredMessage={sessionMsg}
      />
    )
  }

  if (page === 'signup') {
    return (
      <Signup
        onBack={goHome}
        onNavigateToLogin={() => setPage('login')}
      />
    )
  }

  if (page === 'viewEmployee') {
    return (
      <ViewEmployee
        onBack={goHome}
        onNavigateToAdd={() => setPage('addEmployee')}
        onNavigateToUpdate={() => setPage('updateEmployee')}
        onNavigateToRemove={() => setPage('removeEmployee')}
        onNavigateToDashboard={() => setPage('dashboard')}
        onLogout={handleLogout}
      />
    )
  }

  if (page === 'dashboard') {
    return (
      <Dashboard
        onBack={() => setPage('viewEmployee')}
        onNavigateToAdd={() => setPage('addEmployee')}
        onNavigateToUpdate={() => setPage('updateEmployee')}
        onLogout={handleLogout}
      />
    )
  }

  if (page === 'addEmployee') return <AddEmployee onBack={goHome} onNavigateToView={() => setPage('viewEmployee')} />
  if (page === 'removeEmployee') return <RemoveEmployee onBack={goHome} onNavigateToView={() => setPage('viewEmployee')} />
  if (page === 'updateEmployee') return <UpdateEmployee onBack={goHome} onNavigateToView={() => setPage('viewEmployee')} />

  return (
    <Home
      onLogin={() => setPage('login')}
      onSignup={() => setPage('signup')}
      onViewEmployees={() => setPage('viewEmployee')}
      onAbout={() => setPage('about')}
    />
  )
}

export default App
