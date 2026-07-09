import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const T = {
  plans: 'study_plans',
  classes: 'study_plan_classes',
  enrollments: 'enrollments',
  programs: 'programs',
  courses: 'courses',
  faculty: 'faculty',
  students: 'students',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function StudyPlansPage() {
  const [plans, setPlans] = useState([])
  const [classes, setClasses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [students, setStudents] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [sp, cls, enr, prg, crs, fac, stu] = await Promise.all([
      supabase.from(T.plans).select('*').order('semester', { ascending: true }),
      supabase.from(T.classes).select('*'),
      supabase.from(T.enrollments).select('*'),
      supabase.from(T.programs).select('*'),
      supabase.from(T.courses).select('*'),
      supabase.from(T.faculty).select('*').order('full_name'),
      supabase.from(T.students).select('*'),
    ])
    ;[sp, cls, enr, prg, crs, fac, stu].forEach((x) => x.error && message.error(x.error.message))
    setPlans(sp.data || [])
    setClasses(cls.data || [])
    setEnrollments(enr.data || [])
    setPrograms(prg.data || [])
    setCourses(crs.data || [])
    setFaculty(fac.data || [])
    setStudents(stu.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_code', 'code', 'name', 'program_name'], '')
  const courseName = (id) => {
    const c = courses.find((x) => x.id === id)
    return `${pick(c, ['course_code', 'code'], '')} - ${pick(c, ['course_name', 'name'], '')}`
  }
  const teacherName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name'], '')
  const studentName = (id) => {
    const s = students.find((x) => x.id === id)
    return `${pick(s, ['student_code', 'code'], '')} - ${pick(s, ['full_name', 'name'], '')}`
  }

  const classIdsOfPlan = (planId) => classes.filter((c) => c.study_plan_id === planId).map((c) => c.id)
  const enrollmentsOfPlan = (planId) => {
    const classIds = classIdsOfPlan(planId)
    return enrollments.filter((e) => classIds.includes(e.study_plan_class_id) || e.study_plan_id === planId)
  }
  const enrollmentsOfClass = (classId) => enrollments.filter((e) => e.study_plan_class_id === classId)

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return plans.map((p) => {
      const cls = classes.filter((c) => c.study_plan_id === p.id)
      const regCount = enrollmentsOfPlan(p.id).length
      const max = cls.reduce((s, c) => s + Number(c.max_students || 0), 0)
      return { ...p, class_count_actual: cls.length, registered_count: regCount, total_capacity: max }
    }).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q) || courseName(r.course_id).toLowerCase().includes(q) || programName(r.program_id).toLowerCase().includes(q))
  }, [plans, classes, enrollments, keyword])

  const stats = useMemo(() => ({
    total: plans.length,
    required: plans.filter((x) => String(pick(x, ['course_type', 'type'], '')).includes('Bắt')).length,
    elective: plans.filter((x) => String(pick(x, ['course_type', 'type'], '')).includes('Tự')).length,
    credits: rows.reduce((s, r) => s + Number(pick(courses.find((c) => c.id === r.course_id), ['credits'], 0)), 0),
    registrations: rows.reduce((s, r) => s + Number(r.registered_count || 0), 0),
  }), [plans, rows, courses])

  const openPlan = (record = null) => {
    setEditing(record)
    setModal('plan')
    form.resetFields()
    form.setFieldsValue(record || { semester: 'HK1', academic_year: '2026-2027', course_type: 'Bắt buộc', order_no: 1, class_count: 1, max_students: 40, status: 'active' })
  }

  const openClass = (record = null, plan = selectedPlan) => {
    setEditing(record)
    setModal('class')
    form.resetFields()
    form.setFieldsValue(record || { study_plan_id: plan?.id, class_name: 'Lớp 01', max_students: 40, status: 'open' })
  }

  const savePlan = async () => {
    const v = await form.validateFields()
    const payload = { ...v, updated_at: new Date().toISOString() }
    let result
    if (editing?.id) result = await supabase.from(T.plans).update(payload).eq('id', editing.id)
    else result = await supabase.from(T.plans).insert([{ ...payload, created_at: new Date().toISOString() }]).select('id').single()
    if (result.error) {
      if (String(result.error.message).includes('duplicate key')) {
        return message.error('Kế hoạch đã tồn tại. Hãy mở thêm lớp trong phần Thông tin lớp, không tạo trùng kế hoạch.')
      }
      return message.error(result.error.message)
    }
    const planId = editing?.id || result.data.id
    if (!editing?.id) {
      const count = Number(v.class_count || 1)
      const newClasses = Array.from({ length: count }).map((_, i) => ({
        study_plan_id: planId,
        class_code: `${pick(courses.find((c) => c.id === v.course_id), ['course_code', 'code'], 'HP')}-${String(i + 1).padStart(2, '0')}`,
        class_name: `Lớp ${String(i + 1).padStart(2, '0')}`,
        teacher_id: v.teacher_id || null,
        max_students: Number(v.max_students || 40),
        start_date: v.start_date || null,
        end_date: v.end_date || null,
        status: 'open',
      }))
      await supabase.from(T.classes).insert(newClasses)
    }
    message.success('Đã lưu kế hoạch')
    setModal(null); setEditing(null); load()
  }

  const saveClass = async () => {
    const v = await form.validateFields()
    const payload = { ...v, updated_at: new Date().toISOString() }
    const result = editing?.id
      ? await supabase.from(T.classes).update(payload).eq('id', editing.id)
      : await supabase.from(T.classes).insert([{ ...payload, created_at: new Date().toISOString() }])
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu lớp học phần')
    setModal(null); setEditing(null); load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const exportRegistered = () => {
    const data = selectedClass ? enrollmentsOfClass(selectedClass.id) : selectedPlan ? enrollmentsOfPlan(selectedPlan.id) : []
    const output = data.map((e) => ({
      'Học viên': studentName(e.student_id),
      'Học phần': selectedPlan ? courseName(selectedPlan.course_id) : '',
      'Lớp': selectedClass?.class_name || '',
      'Ngày đăng ký': pick(e, ['registered_at', 'created_at'], ''),
      'Trạng thái': pick(e, ['status'], ''),
      'Ghi chú': pick(e, ['note'], ''),
    }))
    exportCsv('danh-sach-dang-ky.csv', output)
  }

  const planColumns = [
    { title: 'CTĐT', dataIndex: 'program_id', render: (_, r) => <><b>{programName(r.program_id)}</b><div className="muted">{pick(programs.find((p) => p.id === r.program_id), ['program_name', 'name'], '')}</div></> },
    { title: 'Học phần', dataIndex: 'course_id', render: (_, r) => <b>{courseName(r.course_id)}</b> },
    { title: 'TC', align: 'center', render: (_, r) => pick(courses.find((c) => c.id === r.course_id), ['credits'], '') },
    { title: 'Học kỳ', dataIndex: 'semester', align: 'center' },
    { title: 'Năm học', dataIndex: 'academic_year', align: 'center' },
    { title: 'Loại', dataIndex: 'course_type', render: (v) => <Tag color={String(v).includes('Tự') ? 'purple' : 'blue'}>{v || 'Bắt buộc'}</Tag> },
    { title: 'Thứ tự', dataIndex: 'order_no', align: 'center' },
    { title: 'Số lớp mở', dataIndex: 'class_count_actual', align: 'center' },
    { title: 'Số HV đăng ký', dataIndex: 'registered_count', align: 'center', render: (v, r) => <a onClick={() => { setSelectedPlan(r); setSelectedClass(null) }}>{v}</a> },
    { title: 'Sĩ số tối đa', dataIndex: 'total_capacity', align: 'center' },
    { title: 'Giảng viên phụ trách', dataIndex: 'teacher_id', render: (v) => teacherName(v) || <span className="muted">Chưa phân công</span> },
    { title: 'Thời gian bắt đầu', dataIndex: 'start_date' },
    { title: 'Thời gian kết thúc', dataIndex: 'end_date' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color="green">{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EyeOutlined />} onClick={() => setSelectedPlan(r)} /><Button icon={<EditOutlined />} onClick={() => openPlan(r)} /><Popconfirm title="Xóa kế hoạch?" onConfirm={() => remove(T.plans, r.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ]

  const selectedClasses = selectedPlan ? classes.filter((c) => c.study_plan_id === selectedPlan.id) : []
  const selectedRegs = selectedClass ? enrollmentsOfClass(selectedClass.id) : selectedPlan ? enrollmentsOfPlan(selectedPlan.id) : []
  const selectedCapacity = selectedClass ? Number(selectedClass.max_students || 0) : selectedClasses.reduce((s, c) => s + Number(c.max_students || 0), 0)
  const fillRate = selectedCapacity ? Math.round((selectedRegs.length / selectedCapacity) * 100) : 0

  return <>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start' }}>
      <div><h1 className="page-title">Kế hoạch học tập</h1><div className="page-subtitle">Quản lý kế hoạch mở lớp, phân công giảng viên và theo dõi đăng ký học phần.</div></div>
      <Space><Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button><Button icon={<DownloadOutlined />} onClick={() => exportCsv('ke-hoach-hoc-tap.csv', rows)}>Xuất Excel</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openPlan()}>Thêm kế hoạch</Button></Space>
    </div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng kế hoạch KHHT</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Bắt buộc</div><h2>{stats.required}</h2></Card>
      <Card className="stat-card"><div className="muted">Tự chọn</div><h2>{stats.elective}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng tín chỉ</div><h2>{stats.credits}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng số HV đăng ký</div><h2>{stats.registrations}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Input prefix={<SearchOutlined />} placeholder="Tìm theo CTĐT, học phần, học kỳ..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 360 }} />
        <Button type="primary">Tìm kiếm</Button>
        <Button onClick={() => setKeyword('')}>Làm mới</Button>
      </Space>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={planColumns} dataSource={rows} scroll={{ x: 1700 }} pagination={{ pageSize: 8 }} onRow={(r) => ({ onClick: () => setSelectedPlan(r) })} />
    </Card>

    {selectedPlan && <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, marginTop:16 }}>
      <Card>
        <Tabs items={[
          { key:'stats', label:'Thống kê đăng ký', children:<Space direction="vertical" style={{ width:'100%' }}><b>{courseName(selectedPlan.course_id)}</b><div>Đã đăng ký: <b>{selectedRegs.length}</b></div><div>Sĩ số tối đa: <b>{selectedCapacity}</b></div><Progress percent={fillRate} /></Space> },
          { key:'regs', label:'Danh sách học viên đã đăng ký', children:<Table rowKey="id" size="small" dataSource={selectedRegs} pagination={{ pageSize: 5 }} columns={[{ title:'#', render:(_, __, i)=>i+1 }, { title:'Học viên', render:(_, r)=>studentName(r.student_id) }, { title:'Ngày đăng ký', render:(_, r)=>pick(r, ['registered_at','created_at'], '') }, { title:'Trạng thái', dataIndex:'status', render:v=><Tag color="green">{v || 'registered'}</Tag> }]} /> },
          { key:'classes', label:'Thông tin lớp học', children:<><Button type="primary" icon={<PlusOutlined />} onClick={() => openClass(null, selectedPlan)} style={{ marginBottom: 12 }}>Thêm lớp học phần</Button><Table rowKey="id" size="small" dataSource={selectedClasses} pagination={false} columns={[{ title:'Lớp', dataIndex:'class_name' }, { title:'Sĩ số tối đa', dataIndex:'max_students' }, { title:'Số HV đăng ký', render:(_, r)=><a onClick={() => setSelectedClass(r)}>{enrollmentsOfClass(r.id).length}</a> }, { title:'Lịch học', dataIndex:'schedule_text' }, { title:'Phòng', dataIndex:'room' }, { title:'Giảng viên', dataIndex:'teacher_id', render:v=>teacherName(v) }, { title:'Bắt đầu', dataIndex:'start_date' }, { title:'Kết thúc', dataIndex:'end_date' }, { title:'Thao tác', render:(_, r)=><Space><Button icon={<EditOutlined />} onClick={() => openClass(r)} /><Popconfirm title="Xóa lớp?" onConfirm={() => remove(T.classes, r.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> }]} /></> },
          { key:'schedule', label:'Lịch giảng dự kiến', children:<div>{selectedClasses.map((c) => <p key={c.id}><b>{c.class_name}</b>: {c.schedule_text || 'Chưa có lịch'} - {c.room || 'Chưa có phòng'} - {teacherName(c.teacher_id)}</p>)}</div> },
        ]} />
      </Card>
      <Space direction="vertical" style={{ width:'100%' }}>
        <Card title="Xuất danh sách đăng ký"><Button block icon={<DownloadOutlined />} onClick={exportRegistered}>Xuất Excel</Button></Card>
        <Card title="Tổng hợp"><div>Số lượng đã đăng ký <b style={{ float:'right' }}>{selectedRegs.length}</b></div><div>Số lượng tối đa <b style={{ float:'right' }}>{selectedCapacity}</b></div><div>Còn lại <b style={{ float:'right' }}>{Math.max(selectedCapacity - selectedRegs.length, 0)}</b></div><div>Tỷ lệ lấp đầy <b style={{ float:'right' }}>{fillRate}%</b></div><Progress percent={fillRate} /></Card>
      </Space>
    </div>}

    <Modal title="Kế hoạch học tập" open={modal === 'plan'} onCancel={() => setModal(null)} onOk={savePlan} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="program_id" label="CTĐT" rules={[{ required:true }]}><Select showSearch optionFilterProp="label" options={programs.map((p)=>({ value:p.id, label:programName(p.id) }))} /></Form.Item>
        <Form.Item name="course_id" label="Học phần" rules={[{ required:true }]}><Select showSearch optionFilterProp="label" options={courses.map((c)=>({ value:c.id, label:courseName(c.id) }))} /></Form.Item>
        <Form.Item name="academic_year" label="Năm học"><Input /></Form.Item>
        <Form.Item name="semester" label="Học kỳ"><Input /></Form.Item>
        <Form.Item name="course_type" label="Loại"><Select options={[{ value:'Bắt buộc' }, { value:'Tự chọn' }, { value:'Luận văn/Luận án' }]} /></Form.Item>
        <Form.Item name="order_no" label="Thứ tự"><InputNumber min={1} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="class_count" label="Số lớp mở"><InputNumber min={1} max={20} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="max_students" label="Sĩ số tối đa/lớp"><InputNumber min={1} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="teacher_id" label="Giảng viên phụ trách"><Select allowClear showSearch optionFilterProp="label" options={faculty.map((f)=>({ value:f.id, label:teacherName(f.id) }))} /></Form.Item>
        <Form.Item name="start_date" label="Thời gian bắt đầu"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="end_date" label="Thời gian kết thúc"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value:'active', label:'Đang áp dụng' }, { value:'inactive', label:'Ngưng áp dụng' }]} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Lớp học phần" open={modal === 'class'} onCancel={() => setModal(null)} onOk={saveClass} okText="Lưu" cancelText="Hủy" width={850}>
      <Form form={form} layout="vertical"><div className="form-grid">
        <Form.Item name="study_plan_id" label="Kế hoạch"><Select options={plans.map((p)=>({ value:p.id, label:courseName(p.course_id) }))} /></Form.Item>
        <Form.Item name="class_code" label="Mã lớp"><Input /></Form.Item>
        <Form.Item name="class_name" label="Tên lớp"><Input /></Form.Item>
        <Form.Item name="teacher_id" label="Giảng viên dạy"><Select allowClear showSearch optionFilterProp="label" options={faculty.map((f)=>({ value:f.id, label:teacherName(f.id) }))} /></Form.Item>
        <Form.Item name="max_students" label="Sĩ số tối đa"><InputNumber min={1} style={{ width:'100%' }} /></Form.Item>
        <Form.Item name="room" label="Phòng học"><Input /></Form.Item>
        <Form.Item name="schedule_text" label="Lịch học" className="full"><Input placeholder="VD: Thứ 2 (18:15-20:45)" /></Form.Item>
        <Form.Item name="start_date" label="Thời gian bắt đầu"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="end_date" label="Thời gian kết thúc"><Input placeholder="YYYY-MM-DD" /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value:'open', label:'Đang mở' }, { value:'closed', label:'Đã đóng' }]} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
