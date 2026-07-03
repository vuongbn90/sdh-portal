import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Steps, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'workflows'
const stepTable = 'workflow_steps'

const workflowSteps = [
  { key: 'topic_registered', title: 'Đăng ký đề tài' },
  { key: 'topic_approved', title: 'Duyệt đề tài' },
  { key: 'supervisor_assigned', title: 'Phân công GVHD' },
  { key: 'seminar_completed', title: 'Seminar' },
  { key: 'defense_completed', title: 'Bảo vệ' },
]

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function toDateValue(value) {
  return value ? dayjs(value) : null
}

function dateString(value) {
  return value ? dayjs(value).format('YYYY-MM-DD') : null
}

export default function WorkflowPage() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [phdStudents, setPhdStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [stepOpen, setStepOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [form] = Form.useForm()
  const [stepForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])

    const { data: studentData } = await supabase.from('students').select('*')
    setStudents(studentData || [])

    const { data: phdData } = await supabase.from('phd_students').select('*')
    setPhdStudents(phdData || [])

    const { data: facultyData } = await supabase.from('faculty').select('*').order('full_name', { ascending: true })
    setFaculty(facultyData || [])

    const { data: stepData } = await supabase.from(stepTable).select('*')
    setSteps(stepData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const studentName = (id, type) => {
    const source = type === 'NCS' ? phdStudents : students
    const item = source.find((x) => x.id === id)
    return pick(item, ['full_name', 'name', 'ho_ten'], '')
  }

  const facultyName = (id) => pick(faculty.find((x) => x.id === id), ['full_name', 'name'], '')

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q) || studentName(r.learner_id, r.learner_type).toLowerCase().includes(q))
  }, [rows, keyword, students, phdStudents])

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    processing: rows.filter((r) => r.status === 'processing').length,
    completed: rows.filter((r) => r.status === 'completed').length,
  }), [rows])

  const getCurrentStepIndex = (row) => {
    const key = pick(row, ['current_step'], 'topic_registered')
    const index = workflowSteps.findIndex((s) => s.key === key)
    return index >= 0 ? index : 0
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({
      code: '',
      title: '',
      learner_type: 'HV',
      learner_id: null,
      supervisor_id: null,
      current_step: 'topic_registered',
      start_date: dayjs(),
      due_date: null,
      status: 'pending',
      note: '',
    })
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      start_date: toDateValue(record.start_date),
      due_date: toDateValue(record.due_date),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      code: values.code,
      title: values.title,
      learner_type: values.learner_type,
      learner_id: values.learner_id || null,
      supervisor_id: values.supervisor_id || null,
      current_step: values.current_step,
      start_date: dateString(values.start_date),
      due_date: dateString(values.due_date),
      status: values.status,
      note: values.note || '',
      updated_at: new Date().toISOString(),
    }

    let error
    if (editing?.id) {
      const result = await supabase.from(tableName).update(payload).eq('id', editing.id)
      error = result.error
    } else {
      const result = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }
    if (error) return message.error(error.message)
    message.success(editing ? 'Đã cập nhật quy trình' : 'Đã tạo quy trình')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa quy trình')
    load()
  }

  const openSteps = (record) => {
    setSelectedWorkflow(record)
    stepForm.setFieldsValue({ step_key: record.current_step || 'topic_registered', status: 'completed', action_date: dayjs(), comment: '' })
    setStepOpen(true)
  }

  const saveStep = async () => {
    const values = await stepForm.validateFields()
    const payload = {
      workflow_id: selectedWorkflow.id,
      step_key: values.step_key,
      step_name: workflowSteps.find((s) => s.key === values.step_key)?.title || values.step_key,
      status: values.status,
      action_date: dateString(values.action_date),
      comment: values.comment || '',
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from(stepTable).insert([payload])
    if (error) return message.error(error.message)

    await supabase.from(tableName).update({ current_step: values.step_key, updated_at: new Date().toISOString() }).eq('id', selectedWorkflow.id)
    message.success('Đã cập nhật bước quy trình')
    stepForm.resetFields()
    load()
  }

  const selectedSteps = steps.filter((s) => s.workflow_id === selectedWorkflow?.id)

  const columns = [
    { title: 'Mã', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Đề tài / Quy trình', dataIndex: 'title' },
    { title: 'Đối tượng', render: (_, r) => <Tag color={r.learner_type === 'NCS' ? 'purple' : 'blue'}>{r.learner_type}</Tag> },
    { title: 'Học viên/NCS', render: (_, r) => studentName(r.learner_id, r.learner_type) || <span className="muted">Chưa gán</span> },
    { title: 'GVHD', render: (_, r) => facultyName(r.supervisor_id) || <span className="muted">Chưa gán</span> },
    { title: 'Tiến độ', render: (_, r) => <Steps size="small" current={getCurrentStepIndex(r)} items={workflowSteps.map((s) => ({ title: s.title }))} /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : v === 'processing' ? 'blue' : 'gold'}>{v}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<CheckCircleOutlined />} onClick={() => openSteps(r)}>Cập nhật bước</Button><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa quy trình này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const stepColumns = [
    { title: 'Bước', dataIndex: 'step_name' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : 'blue'}>{v}</Tag> },
    { title: 'Ngày xử lý', dataIndex: 'action_date' },
    { title: 'Ghi chú', dataIndex: 'comment' },
  ]

  const learnerOptions = form.getFieldValue('learner_type') === 'NCS'
    ? phdStudents.map((s) => ({ value: s.id, label: pick(s, ['full_name', 'name'], s.id) }))
    : students.map((s) => ({ value: s.id, label: pick(s, ['full_name', 'name'], s.id) }))

  return <>
    <h1 className="page-title">Quy trình điện tử</h1>
    <div className="page-subtitle">Đăng ký đề tài → duyệt → phân công GVHD → seminar → bảo vệ</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng quy trình</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Chờ xử lý</div><h2>{stats.pending}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang xử lý</div><h2>{stats.processing}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoàn thành</div><h2>{stats.completed}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã, tên đề tài, học viên/NCS..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('quy-trinh-dien-tu.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo quy trình</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1600 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật quy trình' : 'Tạo quy trình'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="code" label="Mã quy trình" rules={[{ required: true, message: 'Nhập mã quy trình' }]}><Input placeholder="VD: WF-001" /></Form.Item>
          <Form.Item name="title" label="Tên đề tài/quy trình" rules={[{ required: true, message: 'Nhập tên đề tài/quy trình' }]}><Input /></Form.Item>
          <Form.Item name="learner_type" label="Đối tượng"><Select options={[{ value: 'HV', label: 'Học viên cao học' }, { value: 'NCS', label: 'Nghiên cứu sinh' }]} onChange={() => form.setFieldValue('learner_id', null)} /></Form.Item>
          <Form.Item name="learner_id" label="Học viên/NCS"><Select allowClear showSearch optionFilterProp="label" options={learnerOptions} /></Form.Item>
          <Form.Item name="supervisor_id" label="Người hướng dẫn"><Select allowClear showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
          <Form.Item name="current_step" label="Bước hiện tại"><Select options={workflowSteps.map((s) => ({ value: s.key, label: s.title }))} /></Form.Item>
          <Form.Item name="start_date" label="Ngày bắt đầu"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="due_date" label="Hạn xử lý"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'pending', label: 'Chờ xử lý' }, { value: 'processing', label: 'Đang xử lý' }, { value: 'completed', label: 'Hoàn thành' }]} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>

    <Modal title={`Cập nhật bước: ${pick(selectedWorkflow, ['code'], '')}`} open={stepOpen} onCancel={() => setStepOpen(false)} footer={null} width={900}>
      <Form form={stepForm} layout="vertical" onFinish={saveStep}>
        <div className="form-grid">
          <Form.Item name="step_key" label="Bước" rules={[{ required: true, message: 'Chọn bước' }]}><Select options={workflowSteps.map((s) => ({ value: s.key, label: s.title }))} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'completed', label: 'Hoàn thành' }, { value: 'processing', label: 'Đang xử lý' }, { value: 'pending', label: 'Chờ xử lý' }]} /></Form.Item>
          <Form.Item name="action_date" label="Ngày xử lý"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="comment" label="Ghi chú" className="full"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label=" "><Button type="primary" htmlType="submit">Lưu bước</Button></Form.Item>
        </div>
      </Form>
      <Table rowKey="id" columns={stepColumns} dataSource={selectedSteps} pagination={false} />
    </Modal>
  </>
}
