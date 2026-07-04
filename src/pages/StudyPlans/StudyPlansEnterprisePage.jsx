import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tabs, Tag, Tooltip, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tables = {
  plans: 'study_plans',
  classes: 'study_plan_classes',
  schedules: 'study_plan_schedules',
  classStudents: 'class_students',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function fmtDate(v) {
  if (!v) return ''
  return dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : String(v)
}

function csvSafeRows(rows) {
  return rows.map((r) => ({ ...r }))
}

export default function StudyPlansEnterprisePage() {
  const [plans, setPlans] = useState([])
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [classes, setClasses] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [schedules, setSchedules] = useState([])
  const [keyword, setKeyword] = useState('')
  const [programFilter, setProgramFilter] = useState(null)
  const [semesterFilter, setSemesterFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [p, pr, c, f, st, en, cls, cs, sch] = await Promise.all([
      supabase.from(tables.plans).select('*').order('sequence_no', { ascending: true }),
      supabase.from('programs').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('faculty').select('*'),
      supabase.from('students').select('*'),
      supabase.from('enrollments').select('*'),
      supabase.from(tables.classes).select('*'),
      supabase.from(tables.classStudents).select('*'),
      supabase.from(tables.schedules).select('*').order('session_no', { ascending: true }),
    ])
    ;[p, pr, c, f, st, en, cls, cs, sch].forEach((x) => x.error && message.warning(x.error.message))
    setPlans(p.data || [])
    setPrograms(pr.data || [])
    setCourses(c.data || [])
    setFaculty(f.data || [])
    setStudents(st.data || [])
    setEnrollments(en.data || [])
    setClasses(cls.data || [])
    setClassStudents(cs.data || [])
    setSchedules(sch.data || [])
    if (!selectedPlanId && (p.data || []).length) setSelectedPlanId(p.data[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_code', 'code'], '') + (id ? '\n' : '') + pick(programs.find((x) => x.id === id), ['program_name', 'name', 'title'], '')
  const courseName = (id) => pick(courses.find((x) => x.id === id), ['course_name', 'name', 'title'], '')
  const courseCode = (id) => pick(courses.find((x) => x.id === id), ['course_code', 'code'], '')
  const courseCredits = (id) => Number(pick(courses.find((x) => x.id === id), ['credits', 'credit'], 0))
  const facultyName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name'], '')
  const studentName = (id) => pick(students.find((x) => x.id === id), ['full_name', 'name'], '')
  const studentCode = (id) => pick(students.find((x) => x.id === id), ['student_code', 'code'], '')
  const studentEmail = (id) => pick(students.find((x) => x.id === id), ['email'], '')
  const studentPhone = (id) => pick(students.find((x) => x.id === id), ['phone'], '')

  const enrollmentCount = (plan) => {
    const courseId = plan.course_id
    const byEnrollments = enrollments.filter((e) => String(e.course_id) === String(courseId) && String(pick(e, ['academic_year'], pick(plan, ['academic_year'], ''))) === String(pick(plan, ['academic_year'], pick(e, ['academic_year'], '')))).length
    const byClassStudents = classStudents.filter((x) => x.study_plan_id === plan.id && !['cancelled', 'canceled', 'hủy'].includes(String(x.status).toLowerCase())).length
    return Math.max(byEnrollments, byClassStudents)
  }

  const planClasses = (planId) => classes.filter((x) => x.study_plan_id === planId)
  const planSchedules = (planId) => schedules.filter((x) => x.study_plan_id === planId)
  const selectedPlan = plans.find((x) => x.id === selectedPlanId) || plans[0]
  const selectedClasses = selectedPlan ? planClasses(selectedPlan.id) : []
  const selectedSchedules = selectedPlan ? planSchedules(selectedPlan.id) : []
  const selectedRegistrations = selectedPlan ? buildRegistrationRows(selectedPlan) : []

  function buildRegistrationRows(plan) {
    const fromClassStudents = classStudents.filter((x) => x.study_plan_id === plan.id).map((x) => ({
      id: x.id,
      student_id: x.student_id,
      student_code: studentCode(x.student_id),
      full_name: studentName(x.student_id),
      email: studentEmail(x.student_id),
      phone: studentPhone(x.student_id),
      class_code: pick(classes.find((c) => c.id === x.class_id), ['class_code', 'class_name'], ''),
      registered_at: x.registered_at,
      status: x.status || 'registered',
      source: 'class_students',
    }))
    if (fromClassStudents.length) return fromClassStudents
    return enrollments.filter((e) => String(e.course_id) === String(plan.course_id)).map((e) => ({
      id: e.id,
      student_id: e.student_id,
      student_code: studentCode(e.student_id),
      full_name: studentName(e.student_id),
      email: studentEmail(e.student_id),
      phone: studentPhone(e.student_id),
      class_code: pick(e, ['class_code'], ''),
      registered_at: pick(e, ['created_at', 'registered_at'], ''),
      status: pick(e, ['status', 'registration_status'], 'registered'),
      source: 'enrollments',
    }))
  }

  const enrichedPlans = useMemo(() => plans.map((p) => {
    const classesOfPlan = planClasses(p.id)
    const registered = enrollmentCount(p)
    const maxStudents = Number(p.max_students || classesOfPlan.reduce((s, c) => s + Number(c.max_students || 0), 0) || 0)
    return {
      ...p,
      course_code: courseCode(p.course_id),
      course_name: courseName(p.course_id),
      credits: Number(p.credits || courseCredits(p.course_id) || 0),
      program_text: programName(p.program_id),
      teacher_name: facultyName(p.teacher_id),
      class_open_count: classesOfPlan.length || Number(p.class_count || 1),
      registered_count: registered,
      max_students_calc: maxStudents,
      remaining: Math.max(maxStudents - registered, 0),
      fill_rate: maxStudents ? Math.round((registered / maxStudents) * 100) : 0,
    }
  }), [plans, classes, enrollments, classStudents, courses, programs, faculty])

  const filteredPlans = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return enrichedPlans.filter((r) => {
      const matchesQ = !q || JSON.stringify(r).toLowerCase().includes(q)
      const matchesProgram = !programFilter || r.program_id === programFilter
      const matchesSem = !semesterFilter || String(r.semester) === String(semesterFilter)
      const matchesStatus = !statusFilter || String(r.status) === String(statusFilter)
      return matchesQ && matchesProgram && matchesSem && matchesStatus
    })
  }, [enrichedPlans, keyword, programFilter, semesterFilter, statusFilter])

  const stats = useMemo(() => ({
    total: filteredPlans.length,
    required: filteredPlans.filter((x) => String(pick(x, ['course_type', 'required'], '')).includes('Bắt') || x.required === true).length,
    elective: filteredPlans.filter((x) => String(pick(x, ['course_type'], '')).includes('Tự')).length,
    credits: filteredPlans.reduce((s, x) => s + Number(x.credits || 0), 0),
    registered: filteredPlans.reduce((s, x) => s + Number(x.registered_count || 0), 0),
  }), [filteredPlans])

  const openPlanModal = (record = null) => {
    setEditing(record)
    setModal('plan')
    form.resetFields()
    form.setFieldsValue({
      program_id: record?.program_id || null,
      course_id: record?.course_id || null,
      academic_year: record?.academic_year || '2026-2027',
      semester: record?.semester || 'HK1',
      course_type: record?.course_type || 'Bắt buộc',
      sequence_no: record?.sequence_no || 1,
      class_count: record?.class_count || 1,
      max_students: record?.max_students || 40,
      teacher_id: record?.teacher_id || null,
      start_date: record?.start_date ? dayjs(record.start_date) : null,
      end_date: record?.end_date ? dayjs(record.end_date) : null,
      status: record?.status || 'active',
      note: record?.note || '',
    })
  }

  const savePlan = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      updated_at: new Date().toISOString(),
    }
    let result
    if (editing?.id) result = await supabase.from(tables.plans).update(payload).eq('id', editing.id)
    else result = await supabase.from(tables.plans).insert([{ ...payload, created_at: new Date().toISOString() }]).select('id').single()
    if (result.error) return message.error(result.error.message)

    const planId = editing?.id || result.data.id
    if (!editing?.id && Number(values.class_count || 0) > 0) {
      const course = courses.find((x) => x.id === values.course_id)
      const base = pick(course, ['course_code', 'code'], 'CLASS')
      const rows = Array.from({ length: Number(values.class_count || 1) }).map((_, i) => ({
        study_plan_id: planId,
        class_code: `${base}-${String(i + 1).padStart(2, '0')}`,
        class_name: `${base} - Lớp ${i + 1}`,
        teacher_id: values.teacher_id || null,
        max_students: values.max_students || 40,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: 'open',
      }))
      await supabase.from(tables.classes).insert(rows)
    }
    message.success('Đã lưu kế hoạch học tập')
    setModal(null); setEditing(null); load()
  }

  const removePlan = async (id) => {
    const { error } = await supabase.from(tables.plans).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa kế hoạch')
    load()
  }

  const exportRegisteredList = () => {
    if (!selectedPlan) return message.warning('Chọn một học phần trong kế hoạch')
    exportCsv(`danh-sach-dang-ky-${selectedPlan.course_code || selectedPlan.id}.csv`, csvSafeRows(selectedRegistrations))
  }

  const columns = [
    { title: 'CTĐT', dataIndex: 'program_text', width: 190, render: (v) => <div style={{ whiteSpace: 'pre-line' }}><b>{String(v).split('\n')[0]}</b><br/><span className="muted">{String(v).split('\n')[1]}</span></div> },
    { title: 'Học phần', dataIndex: 'course_name', width: 260, render: (_, r) => <div><b>{r.course_code}</b><br/>{r.course_name}</div> },
    { title: 'TC', dataIndex: 'credits', align: 'center', width: 70 },
    { title: 'Học kỳ', dataIndex: 'semester', align: 'center', width: 90 },
    { title: 'Năm học', dataIndex: 'academic_year', align: 'center', width: 120 },
    { title: 'Loại', dataIndex: 'course_type', align: 'center', width: 110, render: (v) => <Tag color={String(v).includes('Tự') ? 'purple' : 'blue'}>{v || 'Bắt buộc'}</Tag> },
    { title: 'Thứ tự', dataIndex: 'sequence_no', align: 'center', width: 80 },
    { title: 'Số lớp mở', dataIndex: 'class_open_count', align: 'center', width: 95 },
    { title: 'Số HV đăng ký', dataIndex: 'registered_count', align: 'center', width: 120, render: (v, r) => <Button type="link" onClick={() => setSelectedPlanId(r.id)} icon={<TeamOutlined />}>{v}</Button> },
    { title: 'Sĩ số tối đa', dataIndex: 'max_students_calc', align: 'center', width: 110 },
    { title: 'Giảng viên phụ trách', dataIndex: 'teacher_name', width: 170, render: (v) => v || <span className="muted">Chưa phân công</span> },
    { title: 'Thời gian bắt đầu', dataIndex: 'start_date', align: 'center', width: 140, render: fmtDate },
    { title: 'Thời gian kết thúc', dataIndex: 'end_date', align: 'center', width: 140, render: fmtDate },
    { title: 'Trạng thái', dataIndex: 'status', align: 'center', width: 120, render: (v) => <Tag color={String(v).includes('active') || String(v).includes('open') ? 'green' : 'default'}>{v === 'active' ? 'Đang áp dụng' : v}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 140, render: (_, r) => <Space><Tooltip title="Xem danh sách"><Button icon={<EyeOutlined />} onClick={() => setSelectedPlanId(r.id)} /></Tooltip><Button icon={<EditOutlined />} onClick={() => openPlanModal(r)} /><Popconfirm title="Xóa kế hoạch này?" onConfirm={() => removePlan(r.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ]

  const registrationColumns = [
    { title: '#', render: (_, __, i) => i + 1, width: 60 },
    { title: 'Mã học viên', dataIndex: 'student_code' },
    { title: 'Họ và tên', dataIndex: 'full_name' },
    { title: 'Lớp', dataIndex: 'class_code' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'SĐT', dataIndex: 'phone' },
    { title: 'Ngày đăng ký', dataIndex: 'registered_at', render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color="green">{v || 'registered'}</Tag> },
  ]

  const classColumns = [
    { title: 'Lớp', dataIndex: 'class_code' },
    { title: 'Sĩ số tối đa', dataIndex: 'max_students', align: 'center' },
    { title: 'Số HV đăng ký', align: 'center', render: (_, r) => classStudents.filter((x) => x.class_id === r.id).length },
    { title: 'Lịch học', dataIndex: 'schedule_text' },
    { title: 'Phòng học', dataIndex: 'room' },
    { title: 'Giảng viên dạy', dataIndex: 'teacher_id', render: facultyName },
    { title: 'Bắt đầu', dataIndex: 'start_date', render: fmtDate },
    { title: 'Kết thúc', dataIndex: 'end_date', render: fmtDate },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color="green">{v || 'open'}</Tag> },
  ]

  const scheduleColumns = [
    { title: 'Buổi', dataIndex: 'session_no', align: 'center' },
    { title: 'Ngày', dataIndex: 'session_date', render: fmtDate },
    { title: 'Tiết/Giờ', dataIndex: 'time_slot' },
    { title: 'Phòng', dataIndex: 'room' },
    { title: 'Giảng viên', dataIndex: 'teacher_id', render: facultyName },
    { title: 'Nội dung', dataIndex: 'topic' },
  ]

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <div>
        <div className="muted">Trang chủ / Kế hoạch học tập / Danh sách kế hoạch</div>
        <h1 className="page-title">Kế hoạch học tập</h1>
        <div className="page-subtitle">Quản lý kế hoạch mở lớp, phân công giảng viên và theo dõi đăng ký học phần.</div>
      </div>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
        <Button icon={<FileExcelOutlined />} onClick={() => exportCsv('ke-hoach-hoc-tap.csv', filteredPlans)}>Xuất Excel</Button>
        <Button icon={<FilePdfOutlined />} onClick={() => window.print()}>Xuất PDF</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlanModal()}>Thêm kế hoạch</Button>
      </Space>
    </div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng kế hoạch KHHT</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Bắt buộc</div><h2>{stats.required}</h2></Card>
      <Card className="stat-card"><div className="muted">Tự chọn</div><h2>{stats.elective}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng tín chỉ</div><h2>{stats.credits}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng số HV đăng ký</div><h2>{stats.registered}</h2></Card>
    </div>

    <Card className="table-card">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="Tìm theo CTĐT, học phần, học kỳ..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 360 }} />
        <Select allowClear placeholder="Lọc chương trình" style={{ width: 220 }} value={programFilter} onChange={setProgramFilter} options={programs.map((p) => ({ value: p.id, label: pick(p, ['program_name', 'name', 'title'], p.id) }))} />
        <Select allowClear placeholder="Lọc học kỳ" style={{ width: 180 }} value={semesterFilter} onChange={setSemesterFilter} options={['HK1','HK2','HK3','Luận văn/Luận án'].map((x) => ({ value: x, label: x }))} />
        <Select allowClear placeholder="Trạng thái" style={{ width: 180 }} value={statusFilter} onChange={setStatusFilter} options={[{ value: 'active', label: 'Đang áp dụng' }, { value: 'inactive', label: 'Ngưng' }, { value: 'closed', label: 'Đã đóng' }]} />
        <Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>
      </Space>
      <Table rowKey="id" loading={loading} dataSource={filteredPlans} columns={columns} scroll={{ x: 1750 }} pagination={{ pageSize: 6 }} onRow={(r) => ({ onClick: () => setSelectedPlanId(r.id) })} />
    </Card>

    {selectedPlan && <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>
      <Card>
        <Tabs items={[
          { key: 'stats', label: 'Thống kê đăng ký', children: <Space direction="vertical" style={{ width: '100%' }}>
            <h3>{selectedPlan.course_code} - {selectedPlan.course_name}</h3>
            <Progress percent={selectedPlan.fill_rate || 0} />
            <div>Đã đăng ký: <b>{selectedPlan.registered_count}</b> / Sĩ số tối đa: <b>{selectedPlan.max_students_calc}</b> / Còn lại: <b>{selectedPlan.remaining}</b></div>
          </Space> },
          { key: 'students', label: 'Danh sách học viên đã đăng ký', children: <Table rowKey="id" dataSource={selectedRegistrations} columns={registrationColumns} pagination={{ pageSize: 5 }} /> },
          { key: 'classes', label: 'Thông tin lớp học', children: <Table rowKey="id" dataSource={selectedClasses} columns={classColumns} pagination={false} /> },
          { key: 'schedule', label: 'Lịch giảng dự kiến', children: <Table rowKey="id" dataSource={selectedSchedules} columns={scheduleColumns} pagination={false} /> },
        ]} />
      </Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="Xuất danh sách đăng ký"><Button block icon={<DownloadOutlined />} onClick={exportRegisteredList}>Xuất Excel</Button></Card>
        <Card title="Tổng hợp">
          <p>Số lượng đã đăng ký <b style={{ float: 'right' }}>{selectedPlan.registered_count}</b></p>
          <p>Số lượng tối đa <b style={{ float: 'right' }}>{selectedPlan.max_students_calc}</b></p>
          <p>Còn lại <b style={{ float: 'right' }}>{selectedPlan.remaining}</b></p>
          <p>Tỷ lệ lấp đầy <b style={{ float: 'right' }}>{selectedPlan.fill_rate}%</b></p>
          <Progress percent={selectedPlan.fill_rate || 0} showInfo={false} />
        </Card>
      </Space>
    </div>}

    <Modal title={editing ? 'Cập nhật kế hoạch' : 'Thêm kế hoạch'} open={modal === 'plan'} onCancel={() => setModal(null)} onOk={savePlan} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="program_id" label="Chương trình đào tạo" rules={[{ required: true, message: 'Chọn CTĐT' }]}><Select showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: pick(p, ['program_name', 'name', 'title'], p.id) }))} /></Form.Item>
        <Form.Item name="course_id" label="Học phần" rules={[{ required: true, message: 'Chọn học phần' }]}><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${pick(c, ['course_code', 'code'], '')} - ${pick(c, ['course_name', 'name', 'title'], '')}` }))} /></Form.Item>
        <Form.Item name="academic_year" label="Năm học"><Input placeholder="VD: 2026-2027" /></Form.Item>
        <Form.Item name="semester" label="Học kỳ"><Select options={['HK1','HK2','HK3','Luận văn/Luận án'].map((x) => ({ value: x, label: x }))} /></Form.Item>
        <Form.Item name="course_type" label="Loại"><Select options={[{ value: 'Bắt buộc' }, { value: 'Tự chọn' }, { value: 'Luận văn/Luận án' }]} /></Form.Item>
        <Form.Item name="sequence_no" label="Thứ tự"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="class_count" label="Số lớp mở"><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="max_students" label="Sĩ số tối đa"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="teacher_id" label="Giảng viên phụ trách"><Select allowClear showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang áp dụng' }, { value: 'inactive', label: 'Ngưng' }, { value: 'closed', label: 'Đã đóng' }]} /></Form.Item>
        <Form.Item name="start_date" label="Thời gian bắt đầu"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
        <Form.Item name="end_date" label="Thời gian kết thúc"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
