import { BookOutlined, DollarOutlined, FileDoneOutlined, ReadOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Empty, Space, Tabs, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../services/supabase'

export default function StudentPortalPage() {
  const { profile, studentId, signOut } = useAuth()
  const [student, setStudent] = useState(null)
  const [program, setProgram] = useState(null)
  const [plans, setPlans] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [tuition, setTuition] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!studentId) return
    setLoading(true)
    const { data: s } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle()
    setStudent(s || null)

    if (s?.program_id) {
      const { data: p } = await supabase.from('programs').select('*').eq('id', s.program_id).maybeSingle()
      setProgram(p || null)
      const { data: sp } = await supabase.from('study_plans').select('*').eq('program_id', s.program_id)
      setPlans(sp || [])
    }

    const { data: reg } = await supabase.from('course_registrations').select('*').eq('student_id', studentId)
    setRegistrations(reg || [])

    const { data: tui } = await supabase.from('tuition').select('*').eq('student_id', studentId)
    setTuition(tui || [])

    const { data: gr } = await supabase.from('grades').select('*').eq('student_id', studentId)
    setGrades(gr || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [studentId])

  const stats = useMemo(() => ({
    plans: plans.length,
    registered: registrations.length,
    tuition: tuition.reduce((s, x) => s + Number(x.amount || x.total_amount || 0), 0),
    grades: grades.length,
  }), [plans, registrations, tuition, grades])

  if (!studentId) {
    return <div style={{ padding: 32 }}><Empty description="Tài khoản chưa được liên kết với học viên. Vui lòng liên hệ quản trị viên." /></div>
  }

  return <div style={{ padding: 24 }}>
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <h1>Cổng thông tin học viên</h1>
        <div>Xin chào, <b>{profile?.full_name}</b></div>
      </div>
      <Button onClick={signOut}>Đăng xuất</Button>
    </Space>

    <div className="stat-grid">
      <Card><Space><UserOutlined /><div><div>Hồ sơ</div><h2>{student?.student_code || '-'}</h2></div></Space></Card>
      <Card><Space><ReadOutlined /><div><div>CTĐT/Học phần</div><h2>{stats.plans}</h2></div></Space></Card>
      <Card><Space><BookOutlined /><div><div>Đã đăng ký</div><h2>{stats.registered}</h2></div></Space></Card>
      <Card><Space><DollarOutlined /><div><div>Học phí</div><h2>{stats.tuition.toLocaleString('vi-VN')}</h2></div></Space></Card>
    </div>

    <Tabs items={[
      { key: 'profile', label: 'Thông tin cá nhân', children: <Card loading={loading}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Mã học viên">{student?.student_code}</Descriptions.Item>
          <Descriptions.Item label="Họ tên">{student?.full_name}</Descriptions.Item>
          <Descriptions.Item label="Email">{student?.email}</Descriptions.Item>
          <Descriptions.Item label="Điện thoại">{student?.phone}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{student?.date_of_birth}</Descriptions.Item>
          <Descriptions.Item label="Chương trình">{program?.program_name || program?.name}</Descriptions.Item>
        </Descriptions>
      </Card> },
      { key: 'program', label: 'CTĐT & học phần', children: <Table rowKey="id" loading={loading} dataSource={plans} columns={[
        { title: 'Học kỳ', dataIndex: 'semester' },
        { title: 'Năm học', dataIndex: 'academic_year' },
        { title: 'Học phần', dataIndex: 'course_name' },
        { title: 'Loại', dataIndex: 'course_type' },
        { title: 'Tín chỉ', dataIndex: 'credits' },
        { title: 'Trạng thái', dataIndex: 'status', render: v => <Tag color="green">{v || 'active'}</Tag> },
      ]} /> },
      { key: 'registration', label: 'Đăng ký học phần', children: <Card>
        <p>Hiển thị các lớp học phần đang mở cho chương trình của học viên.</p>
        <Button type="primary" onClick={() => message.info('Mở module Course Registration Portal')}>Vào đăng ký học phần</Button>
      </Card> },
      { key: 'tuition', label: 'Học phí', children: <Table rowKey="id" loading={loading} dataSource={tuition} columns={[
        { title: 'Năm học', dataIndex: 'academic_year' },
        { title: 'Học kỳ', dataIndex: 'semester' },
        { title: 'Số tiền', render: (_, r) => Number(r.amount || r.total_amount || 0).toLocaleString('vi-VN') },
        { title: 'Trạng thái', dataIndex: 'status' },
      ]} /> },
      { key: 'grades', label: 'Kết quả học tập', children: <Table rowKey="id" loading={loading} dataSource={grades} columns={[
        { title: 'Học phần', dataIndex: 'course_name' },
        { title: 'Điểm', dataIndex: 'final_score' },
        { title: 'Kết quả', dataIndex: 'result' },
      ]} /> },
    ]} />
  </div>
}
