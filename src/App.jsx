import { useState } from 'react'
import Login from './pages/Login'
import AppLayout from './layouts/AppLayout'
import { getCurrentUser } from './store/authStore'
export default function App(){
 const [user,setUser]=useState(getCurrentUser())
 return user ? <AppLayout user={user} onLogout={()=>setUser(null)}/> : <Login onLogin={setUser}/>
}
