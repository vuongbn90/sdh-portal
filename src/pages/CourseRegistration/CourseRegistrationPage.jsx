import { DeleteOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tables = {
  students: 'students',
  courses: 'courses',
  faculty: 'faculty',
  programs: 'programs',
  plans: 'study_plans',
  classes: 'study_plan_classes',
  registrations: 'course_registrations',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function CourseRegistrationPage() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [programs, setPrograms] = useState([])
  const [plans, setPlans] = useState([])
  const [classes, setClasses] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [semester, setSemester] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, c, f, p, sp, cl, r] = await Promise.all([
      supabase.from(tables.students).select('*').order('full_name', { ascending: true }),
      supabase.from(tables.courses).select('*'),
      supabase.from(tables.faculty).select('*').order('full_name', { ascending: true }),
      supabase.from(tables.programs).select('*'),
      supabase.from(tables.plans).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.classes).select('*').order('class_code', { ascending: true }),
      supabase.from(tables.registrations).select('*').order('created_at', { ascending: false }),
    ])
    ;[s, c, f, p, sp, cl, r].forEach((x) => x.error && message.error(x.error.message))
    setStudents(s.data || [])
    setCourses(c.data || [])
    setFaculty(f.data || [])
    setPrograms(p.data || [])
    setPlans(sp.data || [])
    setClasses(cl.data || [])
    setRegistrations(r.data || [])
    if (!selectedStudentId && (s.data || []).length) setSelectedStudentId(s.data[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const studentName = (id) => pick(students.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], id || '')
  const courseName = (id) => pick(courses.find((x) => x.id === id), ['course_name', 'name', 'ten_hoc_phan'], id || '')
  const courseCode = (id) => pick(courses.find((x) => x.id === id), ['course_code', 'code', 'ma_hoc_phan'], '')
  const credits = (id) => Number(pick(courses.find((x) => x.id === id), ['credits', 'so_tin_chi'], 0))
  const teacherName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_name', 'name', 'title'], '')
  const planOfClass = (classRow) => plans.find((p) => p.id === classRow.study_plan_id) || {}
  const registeredClassIds = registrations.filter((r) => r.student_id === selectedStudentId && ['registered','approved'].includes(r.status)).map((r) => r.class_id)

  const openedClasses = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return classes.map((cl) => {
      const plan = planOfClass(cl)
      const courseId = cl.course_id || plan.course_id
      const programId = cl.program_id || plan.program_id
      const current = Number(cl.current_students || registrations.filter((r) => r.class_id === cl.id && ['registered','approved'].includes(r.status)).length)
      const max = Number(cl.max_students || 40)
      return {
        ...cl,
        plan,
        course_id: courseId,
        program_id: programId,
        course_code: courseCode(courseId),
        course_name: courseName(courseId),
        credits: credits(courseId),
        program_name: programName(programId),
        semester: cl.semester || plan.semester,
        academic_year: cl.academic_year || plan.academic_year,
        teacher_name: teacherName(cl.teacher_id),
        registered_count: current,
        remaining: Math.max(max - current, 0),
        max_students: max,
        is_registered: registeredClassIds.includes(cl.id),
      }
    }).filter((r) => {
      const text = JSON.stringify(r).toLowerCase()
      return (!q || text.includes(q)) && (!semester || String(r.semester) === String(semester)) && (!academicYear || String(r.academic_year) === String(academicYear))
    })
  }, [classes, plans, courses, faculty, programs, registrations, selectedStudentId, keyword, semester, academicYear])

  const myRegistrations = registrations
    .filter((r) => r.student_id === selectedStudentId)
    .map((r) => {
      const cl = classes.find((x) => x.id === r.class_id) || {}
      const plan = planOfClass(cl)
      const courseId = r.course_id || cl.course_id || plan.course_id
      return { ...r, class_code: cl.class_code, course_name: courseName(courseId), course_code: courseCode(courseId), credits: credits(courseId), teacher_name: teacherName(cl.teacher_id), schedule_text: cl.schedule_text, room: cl.room }
    })

  const stats = useMemo(() => {
    const activeRegs = myRegistrations.filter((r) => ['registered','approved'].includes(r.status))
    const totalCredits = activeRegs.reduce((s, r) => s + Number(r.credits || 0), 0)
    return { registered: activeRegs.length, credits: totalCredits, available: openedClasses.filter((x) => x.remaining > 0).length, full: openedClasses.filter((x) => x.remaining <= 0).length }
  }, [myRegistrations, openedClasses])

  const registerClass = async (record) => {
    if (!selectedStudentId) return message.warning('Vui lòng chọn học viên')
    if (record.is_registered) return message.warning('Học viên đã đăng ký lớp này')
    if (record.remaining <= 0) return message.warning('Lớp học phần đã hết chỗ')

    const payload = {
      student_id: selectedStudentId,
      study_plan_id: record.study_plan_id,
      class_id: record.id,
      course_id: record.course_id,
      program_id: record.program_id,
      semester: record.semester,
      academic_year: record.academic_year,
      status: 'registered',
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from(tables.registrations).insert([payload])
    if (error) return message.error(error.message)
    await supabase.from(tables.classes).update({ current_students: record.registered_count + 1 }).eq('id', record.id)
    message.success('Đăng ký học phần thành công')
    load()
  }

  const cancelRegistration = async (reg) => {
    const { error } = await supabase.from(tables.registrations).update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', reg.id)
    if (error) return message.error(error.message)
    const cl = classes.find((x) => x.id === reg.class_id)
    if (cl) await supabase.from(tables.classes).update({ current_students: Math.max(Number(cl.current_students || 1) - 1, 0) }).eq('id', cl.id)
    message.success('Đã hủy đăng ký')
    load()
  }

  const exportClassList = (record) => {
    const data = registrations.filter((r) => r.class_id === record.id && ['registered','approved'].includes(r.status)).map((r, idx) => ({
      STT: idx + 1,
      MaHV: pick(students.find((s) => s.id === r.student_id), ['student_code', 'code', 'ma_hv'], ''),
      HoTen: studentName(r.student_id),
      Email: pick(students.find((s) => s.id === r.student_id), ['email'], ''),
      DienThoai: pick(students.find((s) => s.id === r.student_id), ['phone'], ''),
      LopHP: record.class_code,
      HocPhan: record.course_name,
      TrangThai: r.status,
      NgayDangKy: r.registration_date,
    }))
    exportCsv(`danh-sach-lop-${record.class_code || record.id}.csv`, data)
  }

  const openColumns = [
    { title: 'Mã HP', dataIndex: 'course_code', width: 100, fixed: 'left' },
    { title: 'Tên học phần', dataIndex: 'course_name', width: 240 },
    { title: 'TC', dataIndex: 'credits', align: 'center', width: 70 },
    { title: 'Lớp', dataIndex: 'class_code', width: 110 },
    { title: 'GV', dataIndex: 'teacher_name', width: 180, render: (v) => v || <span className="muted">Chưa phân công</span> },
    { title: 'Thời gian', dataIndex: 'schedule_text', width: 170, render: (v) => v || <span className="muted">Chưa có</span> },
    { title: 'Phòng', dataIndex: 'room', width: 100 },
    { title: 'Bắt đầu', dataIndex: 'start_date', width: 110 },
    { title: 'Kết thúc', dataIndex: 'end_date', width: 110 },
    { title: 'ĐK', dataIndex: 'registered_count', align: 'center', width: 80 },
    { title: 'Tối đa', dataIndex: 'max_students', align: 'center', width: 80 },
    { title: 'Còn', dataIndex: 'remaining', align: 'center', width: 80, render: (v) => <Tag color={v > 0 ? 'green' : 'red'}>{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (v) => <Tag color={v === 'closed' ? 'red' : 'blue'}>{v || 'open'}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 240, render: (_, r) => <Space>
      <Button type="primary" disabled={r.is_registered || r.remaining <= 0 || r.status === 'closed'} onClick={() => registerClass(r)}>{r.is_registered ? 'Đã đăng ký' : 'Đăng ký'}</Button>
      <Button icon={<DownloadOutlined />} onClick={() => exportClassList(r)}>DS lớp</Button>
    </Space> },
  ]

  const regColumns = [
    { title: 'Mã HP', dataIndex: 'course_code' },
    { title: 'Tên học phần', dataIndex: 'course_name' },
    { title: 'TC', dataIndex: 'credits', align: 'center' },
    { title: 'Lớp', dataIndex: 'class_code' },
    { title: 'GV', dataIndex: 'teacher_name' },
    { title: 'Lịch học', dataIndex: 'schedule_text' },
    { title: 'Phòng', dataIndex: 'room' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'approved' ? 'green' : v === 'cancelled' ? 'red' : 'gold'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => ['registered','approved'].includes(r.status) ? <Popconfirm title="Hủy đăng ký học phần này?" onConfirm={() => cancelRegistration(r)}><Button danger icon={<DeleteOutlined />}>Hủy</Button></Popconfirm> : null },
  ]

  return <>
    <h1 className="page-title">Học viên đăng ký học phần</h1>
    <div className="page-subtitle">Cổng đăng ký học phần theo lớp học phần, tự đồng bộ số lượng đăng ký với Kế hoạch học tập.</div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select style={{ minWidth: 320 }} showSearch optionFilterProp="label" value={selectedStudentId} onChange={setSelectedStudentId} options={students.map((s) => ({ value: s.id, label: `${pick(s, ['student_code','code','ma_hv'], '')} - ${studentName(s.id)}` }))} placeholder="Chọn học viên" />
          <Input prefix={<SearchOutlined />} placeholder="Tìm học phần, lớp, GV..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 280 }} />
          <Input placeholder="Học kỳ" value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 120 }} />
          <Input placeholder="Năm học" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={{ width: 140 }} />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button onClick={() => setResultOpen(true)}>Kết quả đăng ký</Button>
        </Space>
      </Space>
    </Card>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Lớp đã đăng ký</div><h2>{stats.registered}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng tín chỉ</div><h2>{stats.credits}</h2></Card>
      <Card className="stat-card"><div className="muted">Lớp còn chỗ</div><h2>{stats.available}</h2></Card>
      <Card className="stat-card"><div className="muted">Lớp đã đầy</div><h2>{stats.full}</h2></Card>
    </div>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={openColumns} dataSource={openedClasses} scroll={{ x: 1700 }} pagination={{ pageSize: 10 }} />
    </Card>

    <Modal title={`Kết quả đăng ký: ${studentName(selectedStudentId)}`} open={resultOpen} onCancel={() => setResultOpen(false)} footer={<Button onClick={() => exportCsv('ket-qua-dang-ky.csv', myRegistrations)}>Xuất CSV</Button>} width={1100}>
      <Table rowKey="id" columns={regColumns} dataSource={myRegistrations} scroll={{ x: 1200 }} pagination={{ pageSize: 8 }} />
    </Modal>
  </>
}
