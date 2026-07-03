import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const ploTable = 'oas_plos'
const cloTable = 'oas_clos'
const mappingTable = 'oas_clo_plo_mapping'
const scoreTable = 'oas_clo_scores'
const rubricTable = 'oas_rubrics'
const criteriaTable = 'oas_rubric_criteria'
const graduationTable = 'oas_graduation_checks'

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function statusByScore(score, target = 70) {
  const s = Number(score || 0)
  const t = Number(target || 70)
  if (s >= t) return { text: 'Đạt', color: 'green' }
  if (s >= t - 10) return { text: 'Cần cải thiện', color: 'gold' }
  return { text: 'Chưa đạt', color: 'red' }
}

function bloomStatus(required, achieved) {
  if (!required || !achieved) return { text: 'Chưa đủ dữ liệu', color: 'default' }
  return Number(achieved) >= Number(required)
    ? { text: 'Đạt Bloom', color: 'green' }
    : { text: 'Chưa đạt Bloom', color: 'red' }
}

export default function OutcomeAssessmentPage() {
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [plos, setPlos] = useState([])
  const [clos, setClos] = useState([])
  const [mappings, setMappings] = useState([])
  const [scores, setScores] = useState([])
  const [rubrics, setRubrics] = useState([])
  const [criteria, setCriteria] = useState([])
  const [graduationChecks, setGraduationChecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const [ploOpen, setPloOpen] = useState(false)
  const [cloOpen, setCloOpen] = useState(false)
  const [mappingOpen, setMappingOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [rubricOpen, setRubricOpen] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const [graduationOpen, setGraduationOpen] = useState(false)

  const [editingPlo, setEditingPlo] = useState(null)
  const [editingClo, setEditingClo] = useState(null)
  const [editingMapping, setEditingMapping] = useState(null)
  const [editingScore, setEditingScore] = useState(null)
  const [editingRubric, setEditingRubric] = useState(null)
  const [editingCriteria, setEditingCriteria] = useState(null)
  const [editingGraduation, setEditingGraduation] = useState(null)

  const [ploForm] = Form.useForm()
  const [cloForm] = Form.useForm()
  const [mappingForm] = Form.useForm()
  const [scoreForm] = Form.useForm()
  const [rubricForm] = Form.useForm()
  const [criteriaForm] = Form.useForm()
  const [graduationForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [programRes, courseRes, studentRes, ploRes, cloRes, mappingRes, scoreRes, rubricRes, criteriaRes, graduationRes] = await Promise.all([
      supabase.from('programs').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('students').select('*'),
      supabase.from(ploTable).select('*').order('code', { ascending: true }),
      supabase.from(cloTable).select('*').order('code', { ascending: true }),
      supabase.from(mappingTable).select('*'),
      supabase.from(scoreTable).select('*').order('created_at', { ascending: false }),
      supabase.from(rubricTable).select('*').order('created_at', { ascending: false }),
      supabase.from(criteriaTable).select('*').order('sequence_no', { ascending: true }),
      supabase.from(graduationTable).select('*').order('created_at', { ascending: false }),
    ])

    const errors = [programRes, courseRes, studentRes, ploRes, cloRes, mappingRes, scoreRes, rubricRes, criteriaRes, graduationRes]
      .map((x) => x.error)
      .filter(Boolean)
    if (errors.length) message.error(errors[0].message)

    setPrograms(programRes.data || [])
    setCourses(courseRes.data || [])
    setStudents(studentRes.data || [])
    setPlos(ploRes.data || [])
    setClos(cloRes.data || [])
    setMappings(mappingRes.data || [])
    setScores(scoreRes.data || [])
    setRubrics(rubricRes.data || [])
    setCriteria(criteriaRes.data || [])
    setGraduationChecks(graduationRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['name', 'program_name', 'ten_ctdt'], id || '')
  const courseName = (id) => pick(courses.find((x) => x.id === id), ['name', 'course_name', 'ten_hoc_phan'], id || '')
  const studentName = (id) => pick(students.find((x) => x.id === id), ['full_name', 'name', 'ho_ten'], id || '')
  const ploName = (id) => pick(plos.find((x) => x.id === id), ['code'], id || '')
  const cloName = (id) => pick(clos.find((x) => x.id === id), ['code'], id || '')
  const rubricName = (id) => pick(rubrics.find((x) => x.id === id), ['name'], id || '')

  const ploScores = useMemo(() => {
    return plos.map((plo) => {
      const linkedMappings = mappings.filter((m) => m.plo_id === plo.id)
      const calculated = linkedMappings.map((m) => {
        const cloScores = scores.filter((s) => s.clo_id === m.clo_id)
        if (!cloScores.length) return null
        const avg = cloScores.reduce((sum, x) => sum + Number(x.score || 0), 0) / cloScores.length
        return avg * (Number(m.weight || 0) / 100)
      }).filter((x) => x !== null)
      const score = calculated.length ? calculated.reduce((sum, x) => sum + x, 0) : Number(plo.actual_score || 0)
      const status = statusByScore(score, plo.target_score)
      const bloom = bloomStatus(plo.bloom_required, plo.bloom_achieved)
      return { ...plo, calculated_score: Number(score.toFixed(2)), status, bloom }
    })
  }, [plos, mappings, scores])

  const stats = useMemo(() => {
    const totalPlo = plos.length
    const achieved = ploScores.filter((x) => x.status.text === 'Đạt').length
    const avgScore = ploScores.length ? (ploScores.reduce((sum, x) => sum + Number(x.calculated_score || 0), 0) / ploScores.length).toFixed(1) : 0
    const bloomOk = ploScores.filter((x) => x.bloom.text === 'Đạt Bloom').length
    return { totalPlo, achieved, avgScore, bloomOk }
  }, [plos, ploScores])

  const filteredScores = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return scores
    return scores.filter((r) => JSON.stringify(r).toLowerCase().includes(q) || studentName(r.student_id).toLowerCase().includes(q))
  }, [scores, keyword, students])

  const saveRecord = async ({ table, values, editing, setOpen, successText }) => {
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error
    if (editing?.id) {
      const result = await supabase.from(table).update(payload).eq('id', editing.id)
      error = result.error
    } else {
      const result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }
    if (error) return message.error(error.message)
    message.success(successText)
    setOpen(false)
    load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const openPlo = (record = null) => {
    setEditingPlo(record)
    ploForm.setFieldsValue(record || { program_id: null, code: '', name: '', description: '', bloom_required: 3, bloom_achieved: null, target_score: 70, actual_score: 0, category: 'Kiến thức', status: 'active' })
    setPloOpen(true)
  }

  const openClo = (record = null) => {
    setEditingClo(record)
    cloForm.setFieldsValue(record || { course_id: null, code: '', name: '', description: '', bloom_level: 3, category: 'Kiến thức', weight: 100, status: 'active' })
    setCloOpen(true)
  }

  const openMapping = (record = null) => {
    setEditingMapping(record)
    mappingForm.setFieldsValue(record || { clo_id: null, plo_id: null, weight: 100, contribution_level: 'M', note: '' })
    setMappingOpen(true)
  }

  const openScore = (record = null) => {
    setEditingScore(record)
    scoreForm.setFieldsValue(record || { student_id: null, course_id: null, clo_id: null, assessment_name: '', rubric_id: null, score: 0, max_score: 100, semester: '', academic_year: '', evidence_url: '', note: '' })
    setScoreOpen(true)
  }

  const openRubric = (record = null) => {
    setEditingRubric(record)
    rubricForm.setFieldsValue(record || { clo_id: null, name: '', description: '', max_level: 4, status: 'active' })
    setRubricOpen(true)
  }

  const openCriteria = (record = null) => {
    setEditingCriteria(record)
    criteriaForm.setFieldsValue(record || { rubric_id: null, criterion_name: '', description: '', weight: 25, sequence_no: 1 })
    setCriteriaOpen(true)
  }

  const openGraduation = (record = null) => {
    setEditingGraduation(record)
    graduationForm.setFieldsValue(record || { student_id: null, program_id: null, credit_completed: 0, credit_required: 60, plo_status: 'pending', bloom_status: 'pending', thesis_status: 'pending', english_status: 'pending', final_status: 'pending', note: '' })
    setGraduationOpen(true)
  }

  const ploColumns = [
    { title: 'PLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Mô tả', dataIndex: 'name' },
    { title: 'CTĐT', dataIndex: 'program_id', render: programName },
    { title: 'Bloom yêu cầu', dataIndex: 'bloom_required', align: 'center' },
    { title: 'Bloom đạt', dataIndex: 'bloom_achieved', align: 'center' },
    { title: 'Target', dataIndex: 'target_score', align: 'center' },
    { title: 'Actual', dataIndex: 'calculated_score', align: 'center', render: (v) => <b>{v}</b> },
    { title: 'Kết quả', render: (_, r) => <Tag color={r.status.color}>{r.status.text}</Tag> },
    { title: 'Bloom', render: (_, r) => <Tag color={r.bloom.color}>{r.bloom.text}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openPlo(r)}>Sửa</Button><Popconfirm title="Xóa PLO?" onConfirm={() => remove(ploTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const cloColumns = [
    { title: 'CLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Mô tả', dataIndex: 'name' },
    { title: 'Học phần', dataIndex: 'course_id', render: courseName },
    { title: 'Bloom', dataIndex: 'bloom_level', align: 'center' },
    { title: 'Nhóm', dataIndex: 'category' },
    { title: 'Trọng số', dataIndex: 'weight', align: 'center' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openClo(r)}>Sửa</Button><Popconfirm title="Xóa CLO?" onConfirm={() => remove(cloTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const mappingColumns = [
    { title: 'CLO', dataIndex: 'clo_id', render: cloName },
    { title: 'PLO', dataIndex: 'plo_id', render: ploName },
    { title: 'Weight', dataIndex: 'weight', align: 'center', render: (v) => `${v || 0}%` },
    { title: 'Mức đóng góp', dataIndex: 'contribution_level', render: (v) => <Tag color={v === 'M' ? 'green' : v === 'R' ? 'blue' : 'gold'}>{v}</Tag> },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openMapping(r)}>Sửa</Button><Popconfirm title="Xóa mapping?" onConfirm={() => remove(mappingTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const scoreColumns = [
    { title: 'Học viên', dataIndex: 'student_id', render: studentName },
    { title: 'Học phần', dataIndex: 'course_id', render: courseName },
    { title: 'CLO', dataIndex: 'clo_id', render: cloName },
    { title: 'Assessment', dataIndex: 'assessment_name' },
    { title: 'Điểm', dataIndex: 'score', align: 'center', render: (v, r) => <b>{v}/{r.max_score || 100}</b> },
    { title: 'Năm học', dataIndex: 'academic_year' },
    { title: 'Học kỳ', dataIndex: 'semester' },
    { title: 'Minh chứng', dataIndex: 'evidence_url' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openScore(r)}>Sửa</Button><Popconfirm title="Xóa điểm CLO?" onConfirm={() => remove(scoreTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const rubricColumns = [
    { title: 'Rubric', dataIndex: 'name', render: (v) => <b>{v}</b> },
    { title: 'CLO', dataIndex: 'clo_id', render: cloName },
    { title: 'Mức tối đa', dataIndex: 'max_level', align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openRubric(r)}>Sửa</Button><Popconfirm title="Xóa rubric?" onConfirm={() => remove(rubricTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const criteriaColumns = [
    { title: 'Rubric', dataIndex: 'rubric_id', render: rubricName },
    { title: 'Tiêu chí', dataIndex: 'criterion_name' },
    { title: 'Weight', dataIndex: 'weight', align: 'center', render: (v) => `${v || 0}%` },
    { title: 'Thứ tự', dataIndex: 'sequence_no', align: 'center' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openCriteria(r)}>Sửa</Button><Popconfirm title="Xóa tiêu chí?" onConfirm={() => remove(criteriaTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const graduationColumns = [
    { title: 'Học viên', dataIndex: 'student_id', render: studentName },
    { title: 'CTĐT', dataIndex: 'program_id', render: programName },
    { title: 'Tín chỉ', render: (_, r) => `${r.credit_completed || 0}/${r.credit_required || 0}` },
    { title: 'PLO', dataIndex: 'plo_status', render: (v) => <Tag color={v === 'passed' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Bloom', dataIndex: 'bloom_status', render: (v) => <Tag color={v === 'passed' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Luận văn', dataIndex: 'thesis_status', render: (v) => <Tag color={v === 'passed' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Ngoại ngữ', dataIndex: 'english_status', render: (v) => <Tag color={v === 'passed' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Kết luận', dataIndex: 'final_status', render: (v) => <Tag color={v === 'passed' ? 'green' : v === 'failed' ? 'red' : 'gold'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openGraduation(r)}>Sửa</Button><Popconfirm title="Xóa kiểm tra tốt nghiệp?" onConfirm={() => remove(graduationTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Outcome Assessment System - Đo lường CĐR</h1>
    <div className="page-subtitle">Đo lường CĐR theo logic Rubric → CLO → PLO → Bloom → Đủ điều kiện tốt nghiệp</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng PLO</div><h2>{stats.totalPlo}</h2></Card>
      <Card className="stat-card"><div className="muted">PLO đạt</div><h2>{stats.achieved}</h2></Card>
      <Card className="stat-card"><div className="muted">Điểm PLO TB</div><h2>{stats.avgScore}</h2></Card>
      <Card className="stat-card"><div className="muted">Bloom đạt</div><h2>{stats.bloomOk}</h2></Card>
    </div>

    <Card style={{ marginBottom: 16 }}>
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
        <Button icon={<DownloadOutlined />} onClick={() => exportCsv('outcome-plo.csv', ploScores)}>Xuất PLO CSV</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openPlo()}>Thêm PLO</Button>
        <Button icon={<PlusOutlined />} onClick={() => openClo()}>Thêm CLO</Button>
        <Button icon={<PlusOutlined />} onClick={() => openMapping()}>Mapping CLO-PLO</Button>
        <Button icon={<PlusOutlined />} onClick={() => openScore()}>Nhập điểm CLO</Button>
      </Space>
    </Card>

    <Tabs items={[
      { key: 'dashboard', label: 'Dashboard CĐR', children: <Card>{ploScores.map((p) => <div key={p.id} style={{ marginBottom: 18 }}><Space style={{ width: '100%', justifyContent: 'space-between' }}><b>{p.code} - {p.name}</b><Tag color={p.status.color}>{p.status.text}</Tag></Space><Progress percent={Math.min(100, Number(p.calculated_score || 0))} status={p.status.color === 'red' ? 'exception' : 'active'} /></div>)}</Card> },
      { key: 'plos', label: 'PLO/CDR', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={ploColumns} dataSource={ploScores} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'clos', label: 'CLO', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={cloColumns} dataSource={clos} scroll={{ x: 1200 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'mapping', label: 'Mapping CLO-PLO', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={mappingColumns} dataSource={mappings} scroll={{ x: 1000 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'rubrics', label: 'Rubrics', children: <><Card style={{ marginBottom: 16 }}><Space><Button type="primary" icon={<PlusOutlined />} onClick={() => openRubric()}>Thêm rubric</Button><Button icon={<PlusOutlined />} onClick={() => openCriteria()}>Thêm tiêu chí</Button></Space></Card><Card className="table-card"><Table rowKey="id" loading={loading} columns={rubricColumns} dataSource={rubrics} scroll={{ x: 1000 }} pagination={{ pageSize: 6 }} /><Table rowKey="id" loading={loading} columns={criteriaColumns} dataSource={criteria} scroll={{ x: 1000 }} pagination={{ pageSize: 6 }} /></Card></> },
      { key: 'scores', label: 'Điểm CLO', children: <><Card className="toolbar-card" style={{ marginBottom: 16 }}><Input prefix={<SearchOutlined />} placeholder="Tìm học viên, học phần, CLO..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} /></Card><Card className="table-card"><Table rowKey="id" loading={loading} columns={scoreColumns} dataSource={filteredScores} scroll={{ x: 1400 }} pagination={{ pageSize: 8 }} /></Card></> },
      { key: 'graduation', label: 'Kiểm tra tốt nghiệp', children: <><Card style={{ marginBottom: 16 }}><Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openGraduation()}>Thêm kiểm tra tốt nghiệp</Button></Card><Card className="table-card"><Table rowKey="id" loading={loading} columns={graduationColumns} dataSource={graduationChecks} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} /></Card></> },
    ]} />

    <Modal title={editingPlo ? 'Cập nhật PLO' : 'Thêm PLO'} open={ploOpen} onCancel={() => setPloOpen(false)} onOk={async () => saveRecord({ table: ploTable, values: await ploForm.validateFields(), editing: editingPlo, setOpen: setPloOpen, successText: 'Đã lưu PLO' })} width={820} okText="Lưu" cancelText="Hủy">
      <Form form={ploForm} layout="vertical"><div className="form-grid">
        <Form.Item name="program_id" label="Chương trình" className="full"><Select allowClear showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) }))} /></Form.Item>
        <Form.Item name="code" label="Mã PLO" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Tên PLO" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="category" label="Nhóm"><Select options={[{ value: 'Kiến thức' }, { value: 'Kỹ năng' }, { value: 'Tự chủ trách nhiệm' }]} /></Form.Item>
        <Form.Item name="bloom_required" label="Bloom yêu cầu"><InputNumber min={1} max={6} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="bloom_achieved" label="Bloom đạt"><InputNumber min={1} max={6} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="target_score" label="Ngưỡng đạt"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="actual_score" label="Điểm thực tế"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={editingClo ? 'Cập nhật CLO' : 'Thêm CLO'} open={cloOpen} onCancel={() => setCloOpen(false)} onOk={async () => saveRecord({ table: cloTable, values: await cloForm.validateFields(), editing: editingClo, setOpen: setCloOpen, successText: 'Đã lưu CLO' })} width={820} okText="Lưu" cancelText="Hủy">
      <Form form={cloForm} layout="vertical"><div className="form-grid">
        <Form.Item name="course_id" label="Học phần" className="full"><Select allowClear showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item>
        <Form.Item name="code" label="Mã CLO" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Tên CLO" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="bloom_level" label="Bloom"><InputNumber min={1} max={6} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="category" label="Nhóm"><Select options={[{ value: 'Kiến thức' }, { value: 'Kỹ năng' }, { value: 'Tự chủ trách nhiệm' }]} /></Form.Item>
        <Form.Item name="weight" label="Trọng số"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Mapping CLO-PLO" open={mappingOpen} onCancel={() => setMappingOpen(false)} onOk={async () => saveRecord({ table: mappingTable, values: await mappingForm.validateFields(), editing: editingMapping, setOpen: setMappingOpen, successText: 'Đã lưu mapping' })} width={760} okText="Lưu" cancelText="Hủy">
      <Form form={mappingForm} layout="vertical"><div className="form-grid">
        <Form.Item name="clo_id" label="CLO" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={clos.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))} /></Form.Item>
        <Form.Item name="plo_id" label="PLO" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={plos.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))} /></Form.Item>
        <Form.Item name="weight" label="Weight (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="contribution_level" label="Mức đóng góp"><Select options={[{ value: 'I', label: 'Introduce' }, { value: 'R', label: 'Reinforce' }, { value: 'M', label: 'Master' }]} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Nhập điểm CLO" open={scoreOpen} onCancel={() => setScoreOpen(false)} onOk={async () => saveRecord({ table: scoreTable, values: await scoreForm.validateFields(), editing: editingScore, setOpen: setScoreOpen, successText: 'Đã lưu điểm CLO' })} width={860} okText="Lưu" cancelText="Hủy">
      <Form form={scoreForm} layout="vertical"><div className="form-grid">
        <Form.Item name="student_id" label="Học viên" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: studentName(s.id) }))} /></Form.Item>
        <Form.Item name="course_id" label="Học phần"><Select allowClear showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item>
        <Form.Item name="clo_id" label="CLO" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={clos.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))} /></Form.Item>
        <Form.Item name="assessment_name" label="Assessment"><Input placeholder="Quiz/Midterm/Final/Project..." /></Form.Item>
        <Form.Item name="rubric_id" label="Rubric"><Select allowClear showSearch optionFilterProp="label" options={rubrics.map((r) => ({ value: r.id, label: r.name }))} /></Form.Item>
        <Form.Item name="score" label="Điểm"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="max_score" label="Điểm tối đa"><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="semester" label="Học kỳ"><Input /></Form.Item>
        <Form.Item name="academic_year" label="Năm học"><Input /></Form.Item>
        <Form.Item name="evidence_url" label="Link minh chứng" className="full"><Input /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={2} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Rubric" open={rubricOpen} onCancel={() => setRubricOpen(false)} onOk={async () => saveRecord({ table: rubricTable, values: await rubricForm.validateFields(), editing: editingRubric, setOpen: setRubricOpen, successText: 'Đã lưu rubric' })} width={760} okText="Lưu" cancelText="Hủy">
      <Form form={rubricForm} layout="vertical"><div className="form-grid">
        <Form.Item name="clo_id" label="CLO"><Select allowClear showSearch optionFilterProp="label" options={clos.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))} /></Form.Item>
        <Form.Item name="name" label="Tên rubric" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="max_level" label="Mức tối đa"><InputNumber min={1} max={10} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active' }, { value: 'inactive' }]} /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Tiêu chí rubric" open={criteriaOpen} onCancel={() => setCriteriaOpen(false)} onOk={async () => saveRecord({ table: criteriaTable, values: await criteriaForm.validateFields(), editing: editingCriteria, setOpen: setCriteriaOpen, successText: 'Đã lưu tiêu chí' })} width={760} okText="Lưu" cancelText="Hủy">
      <Form form={criteriaForm} layout="vertical"><div className="form-grid">
        <Form.Item name="rubric_id" label="Rubric" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={rubrics.map((r) => ({ value: r.id, label: r.name }))} /></Form.Item>
        <Form.Item name="criterion_name" label="Tiêu chí" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="weight" label="Weight (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="sequence_no" label="Thứ tự"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title="Kiểm tra điều kiện tốt nghiệp" open={graduationOpen} onCancel={() => setGraduationOpen(false)} onOk={async () => saveRecord({ table: graduationTable, values: await graduationForm.validateFields(), editing: editingGraduation, setOpen: setGraduationOpen, successText: 'Đã lưu kiểm tra tốt nghiệp' })} width={860} okText="Lưu" cancelText="Hủy">
      <Form form={graduationForm} layout="vertical"><div className="form-grid">
        <Form.Item name="student_id" label="Học viên" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: studentName(s.id) }))} /></Form.Item>
        <Form.Item name="program_id" label="Chương trình"><Select allowClear showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) }))} /></Form.Item>
        <Form.Item name="credit_completed" label="Tín chỉ đạt"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="credit_required" label="Tín chỉ yêu cầu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="plo_status" label="PLO"><Select options={[{ value: 'pending' }, { value: 'passed' }, { value: 'failed' }]} /></Form.Item>
        <Form.Item name="bloom_status" label="Bloom"><Select options={[{ value: 'pending' }, { value: 'passed' }, { value: 'failed' }]} /></Form.Item>
        <Form.Item name="thesis_status" label="Luận văn"><Select options={[{ value: 'pending' }, { value: 'passed' }, { value: 'failed' }]} /></Form.Item>
        <Form.Item name="english_status" label="Ngoại ngữ"><Select options={[{ value: 'pending' }, { value: 'passed' }, { value: 'failed' }]} /></Form.Item>
        <Form.Item name="final_status" label="Kết luận"><Select options={[{ value: 'pending' }, { value: 'passed' }, { value: 'failed' }]} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
