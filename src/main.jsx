import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './styles/global.css'
import './styles/app.css'

import { AuthProvider } from './context/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)