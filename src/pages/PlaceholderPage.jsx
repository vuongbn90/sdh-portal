import { modules } from '../utils/modules'
export default function PlaceholderPage({moduleKey}){
 const mod=modules.find(m=>m[2]===moduleKey)
 return <div className="content"><h1>{mod?.[1]} {mod?.[0]}</h1><p className="muted">Phân hệ này đã có trong kiến trúc Sprint 1. Chức năng CRUD, phân quyền và báo cáo sẽ được triển khai trong các Sprint tiếp theo.</p><section className="panel"><h3>Trạng thái phát triển</h3><ul><li>Đã có route và menu.</li><li>Đã kết nối Supabase.</li><li>Sẵn sàng phát triển bảng dữ liệu, form thêm/sửa/xóa, import/export.</li></ul></section></div>
}
