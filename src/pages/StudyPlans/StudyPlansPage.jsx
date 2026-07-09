import { CalendarOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tabs, Tag, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'study_plans'
const classesTable = 'study_plan_classes'
const schedulesTable = 'study_plan_schedules'
const enrollmentsTable = 'enrollments'

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function fmtDate(value) {
  if (!value) return ''
  return dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : value
}

export default function StudyPlansPage() {
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [classes, setClasses] = useState([])
  const [schedules, setSchedules] = useState([])
  const [keyword, setKeyword] = useState('')
  const [programFilter, setProgramFilter] = useState(null)
  const [semesterFilter, setSemesterFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [sp, pr, cr, fa, st, en, cl, sc] = await Promise.all([
      supabase.from(tableName).select('*').order('academic_year', { ascending: false }).order('order_no', { ascending: true }),
      supabase.from('programs').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('faculty').select('*'),
      supabase.from('students').select('*'),
      supabase.from(enrollmentsTable).select('*'),
      supabase.from(classesTable).select('*'),
      supabase.from(schedulesTable).select('*').order('session_no', { ascending: true }),
    ])
    ;[sp, pr, cr, fa, st, en, cl, sc].forEach((x) => x.error && message.error(x.error.message))
    setRows(sp.data || [])
    setPrograms(pr.data || [])
    setCourses(cr.data || [])
    setFaculty(fa.data || [])
    setStudents(st.data || [])
    setEnrollments(en.data || [])
    setClasses(cl.data || [])
    setSchedules(sc.data || [])
    if (!selected && (sp.data || []).length) setSelected(sp.data[0])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_code', 'code', 'name', 'program_name', 'ten_ctdt'], '')
  const programFullName = (id) => pick(programs.find((x) => x.id === id), ['program_name', 'name', 'ten_ctdt'], '')
  const course = (id) => courses.find((x) => x.id === id) || {}
  const courseCode = (id) => pick(course(id), ['course_code', 'code', 'ma_hoc_phan'], '')
  const courseName = (id) => pick(course(id), ['course_name', 'name', 'ten_hoc_phan'], '')
  const credits = (id) => Number(pick(course(id), ['credits', 'so_tin_chi'], 0))
  const facultyName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const studentName = (id) => pick(students.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], '')
  const studentCode = (id) => pick(students.find((x) => x.id === id), ['student_code', 'code', 'ma_hv'], '')
  const studentEmail = (id) => pick(students.find((x) => x.id === id), ['email'], '')
  const studentPhone = (id) => pick(students.find((x) => x.id === id), ['phone'], '')

  const registrationsOf = (plan) => enrollments.filter((e) => {
    if (e.study_plan_id && e.study_plan_id === plan.id) return true
    if (plan.course_id && e.course_id === plan.course_id && String(e.academic_year || '') === String(plan.academic_year || '')) return true
    return false
  })
  const approvedRegistrationsOf = (plan) => registrationsOf(plan).filter((e) => ['approved', 'Đã duyệt', 'registered', 'Đã đăng ký'].includes(String(e.status)))
  const classesOf = (plan) => classes.filter((c) => c.study_plan_id === plan.id)
  const schedulesOf = (plan) => schedules.filter((s) => s.study_plan_id === plan.id)

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      const text = [programName(r.program_id), programFullName(r.program_id), courseCode(r.course_id), courseName(r.course_id), r.semester, r.academic_year].join(' ').toLowerCase()
      if (q && !text.includes(q)) return false
      if (programFilter && r.program_id !== programFilter) return false
      if (semesterFilter && String(r.semester) !== String(semesterFilter)) return false
      if (statusFilter && String(r.status) !== String(statusFilter)) return false
      return true
    })
  }, [rows, keyword, programFilter, semesterFilter, statusFilter, programs, courses])

  const stats = useMemo(() => ({
    total: rows.length,
    required: rows.filter((r) => String(r.course_type || '').toLowerCase().includes('bắt')).length,
    elective: rows.filter((r) => String(r.course_type || '').toLowerCase().includes('tự')).length,
    credits: rows.reduce((s, r) => s + credits(r.course_id), 0),
    registrations: rows.reduce((s, r) => s + registrationsOf(r).length, 0),
  }), [rows, enrollments, courses])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ course_type: 'Bắt buộc', semester: 'HK1', academic_year: '2026-2027', order_no: 1, class_count: 1, max_students: 40, status: 'active' })
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      start_date: record.start_date ? dayjs(record.start_date) : null,
      end_date: record.end_date ? dayjs(record.end_date) : null,
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      updated_at: new Date().toISOString(),
    }
    let result
    if (editing?.id) result = await supabase.from(tableName).update(payload).eq('id', editing.id).select().single()
    else result = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }]).select().single()
    if (result.error) return message.error(result.error.message)

    const plan = result.data
    const existingClasses = classesOf(plan)
    if (!editing?.id && Number(payload.class_count || 0) > 0) {
      const classRows = Array.from({ length: Number(payload.class_count || 1) }).map((_, i) => ({
        study_plan_id: plan.id,
        class_code: `${courseCode(payload.course_id) || 'HP'}-${String(i + 1).padStart(2, '0')}`,
        teacher_id: payload.teacher_id || null,
        max_students: payload.max_students || 40,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: 'open',
      }))
      await supabase.from(classesTable).insert(classRows)
    } else if (editing?.id && existingClasses.length === 0 && Number(payload.class_count || 0) > 0) {
      await supabase.from(classesTable).insert([{ study_plan_id: plan.id, class_code: `${courseCode(payload.course_id) || 'HP'}-01`, teacher_id: payload.teacher_id || null, max_students: payload.max_students || 40, start_date: payload.start_date, end_date: payload.end_date, status: 'open' }])
    }

    message.success('Đã lưu kế hoạch học tập')
    setOpen(false)
    setEditing(null)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const selectedRegs = selected ? registrationsOf(selected) : []
  const selectedApproved = selected ? approvedRegistrationsOf(selected) : []
  const selectedMax = selected ? (Number(selected.max_students || 0) * Math.max(1, Number(selected.class_count || classesOf(selected).length || 1))) : 0
  const fillRate = selectedMax ? Math.round((selectedRegs.length / selectedMax) * 100) : 0

  const columns = [
    { title: 'CTĐT', width: 180, render: (_, r) => <><b>{programName(r.program_id) || '—'}</b><div className="muted">{programFullName(r.program_id)}</div></> },
    { title: 'Học phần', width: 280, render: (_, r) => <><b>{courseCode(r.course_id)}</b><div>{courseName(r.course_id)}</div></> },
    { title: 'TC', align: 'center', width: 70, render: (_, r) => credits(r.course_id) },
    { title: 'Học kỳ', dataIndex: 'semester', align: 'center', width: 90 },
    { title: 'Năm học', dataIndex: 'academic_year', align: 'center', width: 110 },
    { title: 'Loại', dataIndex: 'course_type', align: 'center', width: 110, render: (v) => <Tag color={String(v).includes('Tự') ? 'purple' : 'blue'}>{v || 'Bắt buộc'}</Tag> },
    { title: 'Thứ tự', dataIndex: 'order_no', align: 'center', width: 80 },
    { title: 'Số lớp mở', align: 'center', width: 100, render: (_, r) => classesOf(r).length || r.class_count || 0 },
    { title: 'Số HV đăng ký', align: 'center', width: 120, render: (_, r) => <Button type="link" onClick={() => setSelected(r)}>{registrationsOf(r).length}</Button> },
    { title: 'Sĩ số tối đa', dataIndex: 'max_students', align: 'center', width: 100 },
    { title: 'Giảng viên phụ trách', width: 180, render: (_, r) => facultyName(r.teacher_id) || <span className="muted">Chưa phân công</span> },
    { title: 'Thời gian bắt đầu', width: 130, render: (_, r) => fmtDate(r.start_date) },
    { title: 'Thời gian kết thúc', width: 130, render: (_, r) => fmtDate(r.end_date) },
    { title: 'Trạng thái', width: 110, render: (_, r) => <Tag color={r.status === 'active' ? 'green' : 'default'}>{r.status === 'active' ? 'Đang áp dụng' : r.status}</Tag> },
    { title: 'Thao tác', fixed: 'right', width: 120, render: (_, r) => <Space><Button icon={<EyeOutlined />} onClick={() => setSelected(r)} /><Button icon={<EditOutlined />} onClick={() => openEdit(r)} /><Popconfirm title="Xóa kế hoạch?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ]

  const registrationColumns = [
    { title: '#', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Mã học viên', render: (_, r) => studentCode(r.student_id) },
    { title: 'Họ và tên', render: (_, r) => studentName(r.student_id) },
    { title: 'Email', render: (_, r) => studentEmail(r.student_id) },
    { title: 'SĐT', render: (_, r) => studentPhone(r.student_id) },
    { title: 'Ngày đăng ký', render: (_, r) => fmtDate(r.created_at) },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={['approved','registered','Đã duyệt','Đã đăng ký'].includes(String(v)) ? 'green' : 'orange'}>{v || 'registered'}</Tag> },
  ]

  const classColumns = [
    { title: 'Lớp', dataIndex: 'class_code' },
    { title: 'Sĩ số tối đa', dataIndex: 'max_students', align: 'center' },
    { title: 'Lịch học', dataIndex: 'schedule_text' },
    { title: 'Phòng học', dataIndex: 'room' },
    { title: 'Giảng viên dạy', render: (_, r) => facultyName(r.teacher_id) },
    { title: 'Bắt đầu', render: (_, r) => fmtDate(r.start_date) },
    { title: 'Kết thúc', render: (_, r) => fmtDate(r.end_date) },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color="green">{v || 'open'}</Tag> },
  ]

  const scheduleColumns = [
    { title: 'Buổi', dataIndex: 'session_no', align: 'center' },
    { title: 'Ngày', render: (_, r) => fmtDate(r.learning_date) },
    { title: 'Thời gian', dataIndex: 'time_text' },
    { title: 'Phòng', dataIndex: 'room' },
    { title: 'Giảng viên', render: (_, r) => facultyName(r.teacher_id) },
    { title: 'Ghi chú', dataIndex: 'note' },
  ]

  const selectedTitle = selected ? `${courseCode(selected.course_id)} - ${courseName(selected.course_id)}` : 'Chưa chọn học phần'

  return <>
    <div className="page-breadcrumb">Trang chủ / Kế hoạch học tập / Danh sách kế hoạch</div>
    <h1 className="page-title">Kế hoạch học tập</h1>
    <div className="page-subtitle">Quản lý kế hoạch mở lớp, phân công giảng viên và theo dõi đăng ký học phần.</div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('ke-hoach-hoc-tap.csv', filtered)}>Xuất Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm kế hoạch</Button>
        </Space>
      </Space>
    </Card>

    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      <Card className="stat-card"><div className="muted">Tổng kế hoạch KHHT</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Bắt buộc</div><h2>{stats.required}</h2></Card>
      <Card className="stat-card"><div className="muted">Tự chọn</div><h2>{stats.elective}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng tín chỉ</div><h2>{stats.credits}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng số HV đăng ký</div><h2>{stats.registrations}</h2></Card>
    </div>

    <Card className="table-card" style={{ marginTop: 16 }}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="Tìm theo CTĐT, học phần, học kỳ..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 360 }} />
        <Select allowClear placeholder="Lọc chương trình" value={programFilter} onChange={setProgramFilter} style={{ width: 230 }} options={programs.map((p) => ({ value: p.id, label: `${programName(p.id)} - ${programFullName(p.id)}` }))} />
        <Select allowClear placeholder="Lọc học kỳ" value={semesterFilter} onChange={setSemesterFilter} style={{ width: 180 }} options={['HK1','HK2','HK3','Luận văn/Luận án'].map((x) => ({ value: x, label: x }))} />
        <Select allowClear placeholder="Trạng thái" value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }} options={[{ value: 'active', label: 'Đang áp dụng' }, { value: 'inactive', label: 'Ngưng áp dụng' }]} />
        <Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1700 }} pagination={{ pageSize: 6 }} onRow={(record) => ({ onClick: () => setSelected(record) })} />
    </Card>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginTop: 16 }}>
      <Card className="table-card">
        <Tabs items={[
          { key: 'summary', label: 'Thống kê đăng ký', children: <Space direction="vertical" style={{ width: '100%' }}>
            <b>{selectedTitle}</b>
            <div>Đã đăng ký: <b>{selectedRegs.length}</b></div>
            <div>Đã duyệt/đã đăng ký: <b>{selectedApproved.length}</b></div>
            <div>Sĩ số tối đa: <b>{selectedMax}</b></div>
            <Progress percent={fillRate} />
          </Space> },
          { key: 'students', label: 'Danh sách học viên đã đăng ký', children: <>
            <b>Danh sách học viên đã đăng ký học phần {selectedTitle}</b>
            <Table rowKey="id" style={{ marginTop: 12 }} columns={registrationColumns} dataSource={selectedRegs} pagination={{ pageSize: 5 }} />
          </> },
          { key: 'classes', label: 'Thông tin lớp học', children: <Table rowKey="id" columns={classColumns} dataSource={selected ? classesOf(selected) : []} pagination={false} /> },
          { key: 'teachers', label: 'Phân công giảng viên', children: <Table rowKey="id" columns={classColumns} dataSource={selected ? classesOf(selected) : []} pagination={false} /> },
          { key: 'schedule', label: 'Lịch giảng dự kiến', children: <Table rowKey="id" columns={scheduleColumns} dataSource={selected ? schedulesOf(selected) : []} pagination={false} /> },
        ]} />
      </Card>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="Xuất danh sách đăng ký">
          <p className="muted">Xuất danh sách học viên đã đăng ký học phần này.</p>
          <Button block icon={<DownloadOutlined />} onClick={() => exportCsv(`dang-ky-${courseCode(selected?.course_id || '')}.csv`, selectedRegs)}>Xuất Excel</Button>
        </Card>
        <Card title="Tổng hợp">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Số lượng đã đăng ký</span><b>{selectedRegs.length}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Số lượng tối đa</span><b>{selectedMax}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Còn lại</span><b>{Math.max(0, selectedMax - selectedRegs.length)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tỷ lệ lấp đầy</span><b>{fillRate}%</b></div>
            <Progress percent={fillRate} showInfo={false} />
          </Space>
        </Card>
      </Space>
    </div>

    <Modal title={editing ? 'Cập nhật kế hoạch học tập' : 'Thêm kế hoạch học tập'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="program_id" label="Chương trình đào tạo" rules={[{ required: true, message: 'Chọn CTĐT' }]}><Select showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: `${programName(p.id)} - ${programFullName(p.id)}` }))} /></Form.Item>
        <Form.Item name="course_id" label="Học phần" rules={[{ required: true, message: 'Chọn học phần' }]}><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${pick(c, ['course_code', 'code', 'ma_hoc_phan'], '')} - ${pick(c, ['course_name', 'name', 'ten_hoc_phan'], '')}` }))} /></Form.Item>
        <Form.Item name="semester" label="Học kỳ"><Select options={['HK1','HK2','HK3','Luận văn/Luận án'].map((x) => ({ value: x, label: x }))} /></Form.Item>
        <Form.Item name="academic_year" label="Năm học"><Input placeholder="2026-2027" /></Form.Item>
        <Form.Item name="course_type" label="Loại"><Select options={[{ value: 'Bắt buộc' }, { value: 'Tự chọn' }, { value: 'Luận văn/Luận án' }]} /></Form.Item>
        <Form.Item name="order_no" label="Thứ tự"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="class_count" label="Số lớp mở"><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="max_students" label="Sĩ số tối đa/lớp"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="teacher_id" label="Giảng viên phụ trách"><Select allowClear showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
        <Form.Item name="start_date" label="Thời gian bắt đầu"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="end_date" label="Thời gian kết thúc"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang áp dụng' }, { value: 'inactive', label: 'Ngưng áp dụng' }]} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
