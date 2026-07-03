import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tables = {
  plo: 'qa_plos',
  clo: 'qa_clos',
  mapping: 'qa_clo_plo_mapping',
  criteria: 'qa_criteria',
  evidence: 'qa_evidence',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function QualityAssurancePage() {
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [plos, setPlos] = useState([])
  const [clos, setClos] = useState([])
  const [mappings, setMappings] = useState([])
  const [criteria, setCriteria] = useState([])
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modal, setModal] = useState({ open: false, type: '', editing: null })
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const [programRes, courseRes, ploRes, cloRes, mapRes, criteriaRes, evidenceRes] = await Promise.all([
      supabase.from('programs').select('*'),
      supabase.from('courses').select('*'),
      supabase.from(tables.plo).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.clo).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.mapping).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.criteria).select('*').order('created_at', { ascending: false }),
      supabase.from(tables.evidence).select('*').order('created_at', { ascending: false }),
    ])
    if (ploRes.error) message.error(ploRes.error.message)
    if (cloRes.error) message.error(cloRes.error.message)
    if (mapRes.error) message.error(mapRes.error.message)
    if (criteriaRes.error) message.error(criteriaRes.error.message)
    if (evidenceRes.error) message.error(evidenceRes.error.message)
    setPrograms(programRes.data || [])
    setCourses(courseRes.data || [])
    setPlos(ploRes.data || [])
    setClos(cloRes.data || [])
    setMappings(mapRes.data || [])
    setCriteria(criteriaRes.data || [])
    setEvidence(evidenceRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const programName = (id) => pick(programs.find((x) => x.id === id), ['name', 'program_name', 'ten_ctdt'], id || '')
  const courseName = (id) => pick(courses.find((x) => x.id === id), ['name', 'course_name', 'ten_hoc_phan'], id || '')
  const ploName = (id) => {
    const item = plos.find((x) => x.id === id)
    return item ? `${pick(item, ['code'])} - ${pick(item, ['name'])}` : id || ''
  }
  const cloName = (id) => {
    const item = clos.find((x) => x.id === id)
    return item ? `${pick(item, ['code'])} - ${pick(item, ['name'])}` : id || ''
  }

  const filterRows = (rows) => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }

  const stats = useMemo(() => ({
    plos: plos.length,
    clos: clos.length,
    mappings: mappings.length,
    evidence: evidence.length,
  }), [plos, clos, mappings, evidence])

  const openCreate = (type) => {
    setModal({ open: true, type, editing: null })
    if (type === 'plo') form.setFieldsValue({ code: '', name: '', program_id: null, domain: 'Kiến thức', bloom_level: 3, description: '', status: 'active' })
    if (type === 'clo') form.setFieldsValue({ code: '', name: '', course_id: null, bloom_level: 3, description: '', status: 'active' })
    if (type === 'mapping') form.setFieldsValue({ clo_id: null, plo_id: null, contribution_level: 'M', assessment_method: '', note: '' })
    if (type === 'criteria') form.setFieldsValue({ code: '', name: '', standard: 'MOET', criterion_group: '', description: '', status: 'active' })
    if (type === 'evidence') form.setFieldsValue({ code: '', name: '', criterion_id: null, file_url: '', owner_unit: '', status: 'available', note: '' })
  }

  const openEdit = (type, record) => {
    setModal({ open: true, type, editing: record })
    form.setFieldsValue(record)
  }

  const closeModal = () => setModal({ open: false, type: '', editing: null })

  const tableForType = (type) => tables[type]

  const save = async () => {
    const values = await form.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    const table = tableForType(modal.type)
    let error
    if (modal.editing?.id) {
      const result = await supabase.from(table).update(payload).eq('id', modal.editing.id)
      error = result.error
    } else {
      const result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }
    if (error) return message.error(error.message)
    message.success(modal.editing ? 'Đã cập nhật' : 'Đã thêm mới')
    closeModal()
    load()
  }

  const remove = async (type, id) => {
    const { error } = await supabase.from(tableForType(type)).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const ploColumns = [
    { title: 'Mã PLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên PLO', dataIndex: 'name' },
    { title: 'CTĐT', dataIndex: 'program_id', render: (id) => programName(id) },
    { title: 'Nhóm', dataIndex: 'domain', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Bloom', dataIndex: 'bloom_level', align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit('plo', r)}>Sửa</Button><Popconfirm title="Xóa PLO?" onConfirm={() => remove('plo', r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const cloColumns = [
    { title: 'Mã CLO', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên CLO', dataIndex: 'name' },
    { title: 'Học phần', dataIndex: 'course_id', render: (id) => courseName(id) },
    { title: 'Bloom', dataIndex: 'bloom_level', align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit('clo', r)}>Sửa</Button><Popconfirm title="Xóa CLO?" onConfirm={() => remove('clo', r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const mappingColumns = [
    { title: 'CLO', dataIndex: 'clo_id', render: (id) => cloName(id) },
    { title: 'PLO', dataIndex: 'plo_id', render: (id) => ploName(id) },
    { title: 'Mức đóng góp', dataIndex: 'contribution_level', render: (v) => <Tag color={v === 'H' ? 'green' : v === 'M' ? 'blue' : 'gold'}>{v}</Tag> },
    { title: 'Phương pháp đánh giá', dataIndex: 'assessment_method' },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit('mapping', r)}>Sửa</Button><Popconfirm title="Xóa mapping?" onConfirm={() => remove('mapping', r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const criteriaColumns = [
    { title: 'Mã tiêu chí', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên tiêu chí', dataIndex: 'name' },
    { title: 'Bộ tiêu chuẩn', dataIndex: 'standard', render: (v) => <Tag color="purple">{v}</Tag> },
    { title: 'Nhóm', dataIndex: 'criterion_group' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit('criteria', r)}>Sửa</Button><Popconfirm title="Xóa tiêu chí?" onConfirm={() => remove('criteria', r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const evidenceColumns = [
    { title: 'Mã minh chứng', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên minh chứng', dataIndex: 'name' },
    { title: 'Tiêu chí', dataIndex: 'criterion_id', render: (id) => pick(criteria.find((x) => x.id === id), ['code', 'name'], '') },
    { title: 'Đơn vị phụ trách', dataIndex: 'owner_unit' },
    { title: 'Link file', dataIndex: 'file_url', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">Mở file</a> : '' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'available' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit('evidence', r)}>Sửa</Button><Popconfirm title="Xóa minh chứng?" onConfirm={() => remove('evidence', r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const renderForm = () => {
    if (modal.type === 'plo') return <>
      <Form.Item name="code" label="Mã PLO" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="name" label="Tên PLO" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="program_id" label="Chương trình" className="full"><Select allowClear options={programs.map((p) => ({ value: p.id, label: programName(p.id) }))} /></Form.Item>
      <Form.Item name="domain" label="Nhóm"><Select options={[{ value: 'Kiến thức' }, { value: 'Kỹ năng' }, { value: 'Tự chủ và trách nhiệm' }]} /></Form.Item>
      <Form.Item name="bloom_level" label="Bloom"><InputNumber min={1} max={6} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active' }, { value: 'inactive' }]} /></Form.Item>
      <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
    </>
    if (modal.type === 'clo') return <>
      <Form.Item name="code" label="Mã CLO" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="name" label="Tên CLO" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="course_id" label="Học phần" className="full"><Select allowClear showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: courseName(c.id) }))} /></Form.Item>
      <Form.Item name="bloom_level" label="Bloom"><InputNumber min={1} max={6} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active' }, { value: 'inactive' }]} /></Form.Item>
      <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
    </>
    if (modal.type === 'mapping') return <>
      <Form.Item name="clo_id" label="CLO" className="full" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={clos.map((c) => ({ value: c.id, label: cloName(c.id) }))} /></Form.Item>
      <Form.Item name="plo_id" label="PLO" className="full" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={plos.map((p) => ({ value: p.id, label: ploName(p.id) }))} /></Form.Item>
      <Form.Item name="contribution_level" label="Mức đóng góp"><Select options={[{ value: 'H', label: 'H - Cao' }, { value: 'M', label: 'M - Trung bình' }, { value: 'L', label: 'L - Thấp' }]} /></Form.Item>
      <Form.Item name="assessment_method" label="Phương pháp đánh giá"><Input /></Form.Item>
      <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
    </>
    if (modal.type === 'criteria') return <>
      <Form.Item name="code" label="Mã tiêu chí" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="name" label="Tên tiêu chí" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="standard" label="Bộ tiêu chuẩn"><Select options={[{ value: 'MOET' }, { value: 'AUN-QA' }, { value: 'Internal KPI' }]} /></Form.Item>
      <Form.Item name="criterion_group" label="Nhóm tiêu chí"><Input /></Form.Item>
      <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active' }, { value: 'inactive' }]} /></Form.Item>
      <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
    </>
    return <>
      <Form.Item name="code" label="Mã minh chứng" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="name" label="Tên minh chứng" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="criterion_id" label="Tiêu chí" className="full"><Select allowClear showSearch optionFilterProp="label" options={criteria.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))} /></Form.Item>
      <Form.Item name="owner_unit" label="Đơn vị phụ trách"><Input /></Form.Item>
      <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'available', label: 'Đã có' }, { value: 'missing', label: 'Thiếu' }, { value: 'updating', label: 'Đang cập nhật' }]} /></Form.Item>
      <Form.Item name="file_url" label="Link file" className="full"><Input /></Form.Item>
      <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
    </>
  }

  return <>
    <h1 className="page-title">Quality Assurance</h1>
    <div className="page-subtitle">Quản lý CLO, PLO, Bloom, mapping, KPI, AUN-QA và kiểm định Bộ GD&ĐT</div>
    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">PLO</div><h2>{stats.plos}</h2></Card>
      <Card className="stat-card"><div className="muted">CLO</div><h2>{stats.clos}</h2></Card>
      <Card className="stat-card"><div className="muted">Mapping</div><h2>{stats.mappings}</h2></Card>
      <Card className="stat-card"><div className="muted">Minh chứng</div><h2>{stats.evidence}</h2></Card>
    </div>
    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm CLO, PLO, mapping, minh chứng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space><Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button><Button icon={<DownloadOutlined />} onClick={() => exportCsv('quality-assurance.csv', [...plos, ...clos, ...mappings, ...criteria, ...evidence])}>Xuất CSV</Button></Space>
      </div>
    </Card>
    <Tabs items={[
      { key: 'plo', label: 'PLO', children: <Card><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('plo')}>Thêm PLO</Button></Space><Table rowKey="id" loading={loading} columns={ploColumns} dataSource={filterRows(plos)} scroll={{ x: 1100 }} /></Card> },
      { key: 'clo', label: 'CLO', children: <Card><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('clo')}>Thêm CLO</Button></Space><Table rowKey="id" loading={loading} columns={cloColumns} dataSource={filterRows(clos)} scroll={{ x: 1100 }} /></Card> },
      { key: 'mapping', label: 'Mapping CLO-PLO', children: <Card><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('mapping')}>Thêm mapping</Button></Space><Table rowKey="id" loading={loading} columns={mappingColumns} dataSource={filterRows(mappings)} scroll={{ x: 1200 }} /></Card> },
      { key: 'criteria', label: 'AUN-QA/MOET', children: <Card><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('criteria')}>Thêm tiêu chí</Button></Space><Table rowKey="id" loading={loading} columns={criteriaColumns} dataSource={filterRows(criteria)} scroll={{ x: 1200 }} /></Card> },
      { key: 'evidence', label: 'Minh chứng', children: <Card><Space style={{ marginBottom: 12 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('evidence')}>Thêm minh chứng</Button></Space><Table rowKey="id" loading={loading} columns={evidenceColumns} dataSource={filterRows(evidence)} scroll={{ x: 1300 }} /></Card> },
    ]} />

    <Modal title={modal.editing ? 'Cập nhật' : 'Thêm mới'} open={modal.open} onCancel={closeModal} onOk={save} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={form} layout="vertical"><div className="form-grid">{renderForm()}</div></Form>
    </Modal>
  </>
}
