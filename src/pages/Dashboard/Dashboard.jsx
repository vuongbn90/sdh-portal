import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Card from '../../components/Card'
import { getDashboardData } from '../../services/dashboardService'

export default function Dashboard(){
 const [data,setData]=useState(null)
 useEffect(()=>{getDashboardData().then(setData)},[])
 const chart=[{name:'Đợt 1',ths:28,ts:8},{name:'Đợt 2',ths:65,ts:12},{name:'Đợt 3',ths:89,ts:16},{name:'Đợt 4',ths:72,ts:14},{name:'Đợt 5',ths:54,ts:10}]
 const pie=[{name:'Q1,Q2',value:156},{name:'Q3,Q4',value:142},{name:'Trong nước',value:198},{name:'Hội thảo',value:78},{name:'Sách',value:52}]
 if(!data) return <div className="content"><h1>Dashboard</h1><p>Đang tải dữ liệu...</p></div>
 return <div className="content"><h1>Dashboard</h1><p className="muted">Tổng quan hệ thống quản lý sau đại học</p><div className="cards">{data.cards.map(c=><Card key={c.key} {...c}/>)}</div><div className="grid3"><section className="panel"><h3>LỊCH BẢO VỆ</h3><p><b>01/07/2026 - Nguyễn Văn An</b><br/>Các yếu tố ảnh hưởng đến ý định mua sắm xanh<br/><span className="tag">Sắp bảo vệ</span></p><p><b>01/07/2026 - Trần Thị Bình</b><br/>Chuyển đổi số và hiệu quả làm việc<br/><span className="tag">Sắp bảo vệ</span></p></section><section className="panel"><h3>THÔNG BÁO MỚI NHẤT</h3>{data.news.map((n,i)=><p key={i}><b>{n.title}</b><br/><span className="muted">{String(n.published_at).slice(0,10)}</span></p>)}</section><section className="panel"><h3>VIỆC CẦN XỬ LÝ</h3>{data.tasks.map((t,i)=><p key={i}><b>{t.title}</b> <span className="badge">{t.count}</span><br/><span>{t.description}</span></p>)}</section></div><div className="grid2"><section className="panel"><h3>BIỂU ĐỒ TUYỂN SINH</h3><ResponsiveContainer width="100%" height={260}><BarChart data={chart}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="ths" name="Thạc sĩ"/><Bar dataKey="ts" name="Tiến sĩ"/></BarChart></ResponsiveContainer></section><section className="panel"><h3>THỐNG KÊ HỒ SƠ KHOA HỌC</h3><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>{pie.map((_,i)=><Cell key={i}/>)}</Pie></PieChart></ResponsiveContainer></section></div></div>
}
