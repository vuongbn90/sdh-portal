import { useMemo, useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import LoginPage from './pages/LoginPage.jsx'
import MainLayout from './layouts/MainLayout.jsx'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sdh_user')
    return saved ? JSON.parse(saved) : null
  })
  const [darkMode, setDarkMode] = useState(false)

  const configTheme = useMemo(() => ({
    token: {
      colorPrimary: '#005baa',
      borderRadius: 12,
      fontFamily: 'Inter, Arial, sans-serif',
    },
    algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }), [darkMode])

  const handleLogin = (profile) => {
    localStorage.setItem('sdh_user', JSON.stringify(profile))
    setUser(profile)
  }

  const handleLogout = () => {
    localStorage.removeItem('sdh_user')
    setUser(null)
  }

  return (
    <ConfigProvider theme={configTheme}>
      {user ? (
        <MainLayout
          user={user}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((v) => !v)}
          onLogout={handleLogout}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </ConfigProvider>
  )
}

export default App
