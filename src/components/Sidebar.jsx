const items = ['Dashboard','Học viên cao học','Nghiên cứu sinh','Giảng viên','Đề tài nghiên cứu','Hội đồng bảo vệ','Luận văn/Luận án','Điểm & Kết quả','Học phí','Báo cáo - Thống kê','Cài đặt']
export default function Sidebar({ page, setPage }) {
  return <aside className="sidebar"><div className="brand"><div className="logo">VAA</div><div><b>HỌC VIỆN HÀNG KHÔNG<br/>VIỆT NAM</b><span>VIỆN ĐÀO TẠO SAU ĐẠI HỌC</span></div></div><nav>{items.map(i=><button key={i} onClick={()=>setPage(i)} className={page===i?'active':''}>{i}</button>)}</nav><div className="support">☎ Hỗ trợ trực tuyến<br/><b>028 3811 2321</b></div></aside>
}
