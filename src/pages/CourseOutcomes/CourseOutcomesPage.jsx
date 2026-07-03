import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tables = {
  plos: 'program_plos',
  clos: 'course_clos',
  mappings: 'clo_plo_mappings',
  prerequisites: 'course_prerequisites',
  rules: 'graduation_rules',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function CourseOutcomesPage() {
  const [courses, setCourses] = useState([])
  const [programs, setPrograms] = useState([])
  const [plos, setPlos] = useState([])
  const [clos, setClos] = useState([])
  const [mappings, setMappings] = useState([])
  const [prerequisites, setPrerequisites] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: plo }, { data: clo }, { data: map }, { data: pre }, { data: rule }] = await Promise.all([
      supabase.from('courses').select('*'),
      supabase.from('programs').select('*'),
      supabase.from(tables.plos).select('*').order('code'),
      supabase.from(tables.clos).select('*').order('code'),
      supabase.from(tables.mappings).select('*'),
      supabase.from(tables.prerequisites).select('*'),
      supabase.from(tables.rules).select('*'),
    ])
    setCourses(c || [])
    setPrograms(p || [])
    setPlos(plo || [])
    setClos(clo || [])
    setMappings(map || [])
    setPrerequisites(pre || [])
    setRules(rule || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const courseName = (id) => pick(courses.find((x) => x.id === id), ['course_name', 'name', 'code'], id || '')
  const programName = (id) => pick(programs.find((x) => x.id === id), ['program_name', 'name', 'title'], id || '')
  const cloName = (id) => pick(clos.find((x) => x.id === id), ['code'], id || '')
  const ploName = (id) => pick(plos.find((x) => x.id === id), ['code'], id || '')

  const stats = useMemo(() => ({
    plos: plos.length,
    clos: clos.length,
    mappings: mappings.length,
    prerequisites: prerequisites.length,
  }), [plos, clos, mappings, prerequisites])

  const openModal = (type, record = null) => {
    setModal(type)
    setEditing(record)
    form.resetFields()
    form.setFieldsValue(record || {})
  }

  const save = async () => {
    const values = await form.validateFields()
    const table = tables[modal]
    const payload = { ...values, updated_at: new Date().toISOString() }
    const result = editing?.id
      ? await supabase.from(table).update(payload).eq('id', editing.id)
      : await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu dữ liệu')
    setModal(null)
    load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const ploColumns = [
    { title: 'Mã PLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên PLO', dataIndex: 'name' },
    { title: 'Nội dung', dataIndex: 'description' },
    { title: 'Nhóm', dataIndex: 'domain' },
    { title: 'Bloom', dataIndex: 'bloom_level', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'CTĐT', dataIndex: 'program_id', render: programName },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openModal('plos', r)}>Sửa</Button><Popconfirm title="Xóa PLO?" onConfirm={() => remove(tables.plos, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const cloColumns = [
    { title: 'Học phần', dataIndex: 'course_id', render: courseName },
    { title: 'Mã CLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Nội dung CLO', dataIndex: 'content' },
    { title: 'Nhóm', dataIndex: 'domain' },
    { title: 'Bloom', dataIndex: 'bloom_level', render: (v) => <Tag color="purple">{v}</Tag> },
    { title: 'Trọng số', dataIndex: 'weight' },
    { title: 'Đánh giá', dataIndex: 'assessment_method' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openModal('clos', r)}>Sửa</Button><Popconfirm title="Xóa CLO?" onConfirm={() => remove(tables.clos, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const mappingColumns = [
    { title: 'Học phần', dataIndex: 'course_id', render: courseName },
    { title: 'CLO', dataIndex: 'clo_id', render: cloName },
    { title: 'PLO', dataIndex: 'plo_id', render: ploName },
    { title: 'Mức đóng góp', dataIndex: 'contribution_level', render: (v) => <Tag color="green">{v}</Tag> },
    { title: 'Điểm', dataIndex: 'score' },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openModal('mappings', r)}>Sửa</Button><Popconfirm title="Xóa mapping?" onConfirm={() => remove(tables.mappings, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const prerequisiteColumns = [
    { title: 'Học phần', dataIndex: 'course_id', render: courseName },
    { title: 'Học phần tiên quyết', dataIndex: 'prerequisite_course_id', render: courseName },
    { title: 'Loại', dataIndex: 'type', render: (v) => <Tag color="gold">{v}</Tag> },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openModal('prerequisites', r)}>Sửa</Button><Popconfirm title="Xóa điều kiện?" onConfirm={() => remove(tables.prerequisites, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const ruleColumns = [
    { title: 'CTĐT', dataIndex: 'program_id', render: programName },
    { title: 'Tổng TC tối thiểu', dataIndex: 'min_total_credits' },
    { title: 'TC bắt buộc', dataIndex: 'min_required_credits' },
    { title: 'TC tự chọn', dataIndex: 'min_elective_credits' },
    { title: 'GPA tối thiểu', dataIndex: 'min_gpa' },
    { title: 'Luận văn', dataIndex: 'require_thesis', render: (v) => v ? 'Có' : 'Không' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openModal('rules', r)}>Sửa</Button><Popconfirm title="Xóa quy định?" onConfirm={() => remove(tables.rules, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const matrixData = courses.map((course) => {
    const row = { course: courseName(course.id) }
    plos.forEach((plo) => {
      const matched = mappings.find((m) => m.course_id === course.id && m.plo_id === plo.id)
      row[plo.code] = matched?.contribution_level || ''
    })
    return row
  })

  const matrixColumns = [{ title: 'Học phần', dataIndex: 'course', fixed: 'left', width: 260 }, ...plos.map((p) => ({ title: p.code, dataIndex: p.code, align: 'center' }))]

  const renderForm = () => {
    if (modal === 'plos') return <><Form.Item name="program_id" label="CTĐT"><Select allowClear options={programs.map((p) => ({ value: p.id, label: programName(p.id) }))} /></Form.Item><Form.Item name="code" label="Mã PLO" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="name" label="Tên PLO"><Input /></Form.Item><Form.Item name="description" label="Nội dung"><Input.TextArea rows={3} /></Form.Item><Form.Item name="domain" label="Nhóm"><Select options={[{ value: 'Kiến thức' }, { value: 'Kỹ năng' }, { value: 'Tự chủ và trách nhiệm' }]} /></Form.Item><Form.Item name="bloom_level" label="Bloom"><Select options={[1,2,3,4,5,6].map((x) => ({ value: `Bậc ${x}` }))} /></Form.Item></>
    if (modal === 'clos') return <><Form.Item name="course_id" label="Học phần" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item><Form.Item name="code" label="Mã CLO" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="content" label="Nội dung CLO"><Input.TextArea rows={3} /></Form.Item><Form.Item name="domain" label="Nhóm"><Select options={[{ value: 'Kiến thức' }, { value: 'Kỹ năng' }, { value: 'Tự chủ và trách nhiệm' }]} /></Form.Item><Form.Item name="bloom_level" label="Bloom"><Select options={[1,2,3,4,5,6].map((x) => ({ value: `Bậc ${x}` }))} /></Form.Item><Form.Item name="weight" label="Trọng số"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item><Form.Item name="assessment_method" label="Phương pháp đánh giá"><Input /></Form.Item></>
    if (modal === 'mappings') return <><Form.Item name="course_id" label="Học phần"><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item><Form.Item name="clo_id" label="CLO"><Select showSearch optionFilterProp="label" options={clos.map((c) => ({ value: c.id, label: `${c.code} - ${courseName(c.course_id)}` }))} /></Form.Item><Form.Item name="plo_id" label="PLO"><Select showSearch optionFilterProp="label" options={plos.map((p) => ({ value: p.id, label: `${p.code} - ${p.name || ''}` }))} /></Form.Item><Form.Item name="contribution_level" label="Mức đóng góp"><Select options={[{ value: 'I' }, { value: 'R' }, { value: 'M' }, { value: '1' }, { value: '2' }, { value: '3' }]} /></Form.Item><Form.Item name="score" label="Điểm"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item><Form.Item name="note" label="Ghi chú"><Input /></Form.Item></>
    if (modal === 'prerequisites') return <><Form.Item name="course_id" label="Học phần"><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item><Form.Item name="prerequisite_course_id" label="Học phần tiên quyết"><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item><Form.Item name="type" label="Loại"><Select options={[{ value: 'Bắt buộc' }, { value: 'Khuyến nghị' }, { value: 'Song hành' }]} /></Form.Item><Form.Item name="note" label="Ghi chú"><Input /></Form.Item></>
    if (modal === 'rules') return <><Form.Item name="program_id" label="CTĐT"><Select showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: programName(p.id) }))} /></Form.Item><Form.Item name="min_total_credits" label="Tổng tín chỉ tối thiểu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="min_required_credits" label="Tín chỉ bắt buộc"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="min_elective_credits" label="Tín chỉ tự chọn"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item><Form.Item name="min_gpa" label="GPA tối thiểu"><InputNumber min={0} max={4} step={0.1} style={{ width: '100%' }} /></Form.Item><Form.Item name="require_thesis" label="Yêu cầu luận văn"><Select options={[{ value: true, label: 'Có' }, { value: false, label: 'Không' }]} /></Form.Item></>
    return null
  }

  return <>
    <h1 className="page-title">Học phần & Chuẩn đầu ra</h1>
    <div className="page-subtitle">Quản lý CLO, PLO, Bloom, mapping CLO-PLO, tiên quyết và kiểm tra tốt nghiệp</div>
    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">PLO</div><h2>{stats.plos}</h2></Card>
      <Card className="stat-card"><div className="muted">CLO</div><h2>{stats.clos}</h2></Card>
      <Card className="stat-card"><div className="muted">Mapping</div><h2>{stats.mappings}</h2></Card>
      <Card className="stat-card"><div className="muted">Tiên quyết</div><h2>{stats.prerequisites}</h2></Card>
    </div>
    <Card className="toolbar-card" style={{ marginBottom: 16 }}><div className="toolbar"><Input prefix={<SearchOutlined />} placeholder="Tìm CLO, PLO, học phần..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} /><Space><Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button><Button icon={<DownloadOutlined />} onClick={() => exportCsv('course-outcomes.csv', [...plos, ...clos, ...mappings])}>Xuất CSV</Button></Space></div></Card>
    <Tabs items={[
      { key: 'plos', label: 'PLO', children: <Card><Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('plos')} style={{ marginBottom: 12 }}>Thêm PLO</Button><Table rowKey="id" loading={loading} columns={ploColumns} dataSource={plos} scroll={{ x: 1200 }} /></Card> },
      { key: 'clos', label: 'CLO & Bloom', children: <Card><Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('clos')} style={{ marginBottom: 12 }}>Thêm CLO</Button><Table rowKey="id" loading={loading} columns={cloColumns} dataSource={clos} scroll={{ x: 1300 }} /></Card> },
      { key: 'mappings', label: 'Mapping CLO-PLO', children: <Card><Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('mappings')} style={{ marginBottom: 12 }}>Thêm mapping</Button><Table rowKey="id" loading={loading} columns={mappingColumns} dataSource={mappings} scroll={{ x: 1200 }} /></Card> },
      { key: 'prerequisites', label: 'Tiên quyết', children: <Card><Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('prerequisites')} style={{ marginBottom: 12 }}>Thêm điều kiện</Button><Table rowKey="id" loading={loading} columns={prerequisiteColumns} dataSource={prerequisites} scroll={{ x: 1000 }} /></Card> },
      { key: 'matrix', label: 'Ma trận CTĐT', children: <Card><Table rowKey="course" columns={matrixColumns} dataSource={matrixData} scroll={{ x: 1400 }} pagination={false} /></Card> },
      { key: 'rules', label: 'Điều kiện tốt nghiệp', children: <Card><Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('rules')} style={{ marginBottom: 12 }}>Thêm quy định</Button><Table rowKey="id" loading={loading} columns={ruleColumns} dataSource={rules} scroll={{ x: 1200 }} /></Card> },
    ]} />
    <Modal title="Cập nhật dữ liệu" open={!!modal} onCancel={() => setModal(null)} onOk={save} okText="Lưu" cancelText="Hủy" width={760}>
      <Form form={form} layout="vertical"><div className="form-grid">{renderForm()}</div></Form>
    </Modal>
  </>
}
