import { modules } from '../utils/modules'
export default function Sidebar({active,setActive}){
 return <aside className="sidebar"><div className="brand"><div className="logo">VAA</div><div><b>HỌC VIỆN HÀNG KHÔNG VIỆT NAM</b><span>VIỆN ĐÀO TẠO SAU ĐẠI HỌC</span></div></div><nav>{modules.map(([name,icon,key])=><button key={key} onClick={()=>setActive(key)} className={active===key?'active':''}><span>{icon}</span>{name}</button>)}</nav><div className="support">☎ Hỗ trợ trực tuyến<br/><b>028 3811 2321</b></div></aside>
}
