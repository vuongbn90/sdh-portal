import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import GenericPage from './pages/GenericPage'
import './styles/app.css'

export default function App(){
  const [page,setPage]=useState('Dashboard')
  const render=()=> page==='Dashboard'?<Dashboard/>:page==='Học viên cao học'?<Students/>:<GenericPage title={page}/>
  return <div className="app"><Sidebar page={page} setPage={setPage}/><main><Header/><div className="content">{render()}</div><footer>© 2026 Viện Đào tạo Sau đại học - Học viện Hàng không Việt Nam</footer></main></div>
}
