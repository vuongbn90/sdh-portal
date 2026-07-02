import { logout } from '../store/authStore'
export default function Navbar({user,onLogout}){
 return <header className="navbar"><div className="hamb">☰</div><b>HỆ THỐNG QUẢN LÝ SAU ĐẠI HỌC</b><div className="spacer"/><input placeholder="Tìm kiếm nhanh..."/><span>{user?.full_name}</span><button onClick={()=>{logout();onLogout()}}>Thoát</button></header>
}
