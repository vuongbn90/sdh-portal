import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Dashboard from '../pages/Dashboard/Dashboard'
import PlaceholderPage from '../pages/PlaceholderPage'
export default function AppLayout({user,onLogout}){
 const [active,setActive]=useState('dashboard')
 return <div className="app"><Sidebar active={active} setActive={setActive}/><main><Navbar user={user} onLogout={onLogout}/>{active==='dashboard'?<Dashboard/>:<PlaceholderPage moduleKey={active}/>}</main></div>
}
