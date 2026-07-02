import { useState } from 'react'
import { login } from '../store/authStore'
export default function Login({onLogin}){
 const [email,setEmail]=useState('admin@vaa.edu.vn'); const [password,setPassword]=useState('123456'); const [err,setErr]=useState('')
 const submit=e=>{e.preventDefault(); const r=login(email,password); if(r.ok) onLogin(r.user); else setErr(r.message)}
 return <div className="login-wrap"><form className="login" onSubmit={submit}><div className="login-logo">VAA</div><h2>SDH Portal</h2><p>Hệ thống quản lý sau đại học</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu" type="password"/><button>Đăng nhập</button>{err&&<div className="error">{err}</div>}</form></div>
}
