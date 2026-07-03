import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Timeline, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const issueTable = 'cqi_issues'
const actionTable = 'cqi_actions'
const evidenceTable = 'cqi_evidence'
const followupTable = 'cqi_followups'

function dateString(value) {
  return value ? dayjs(value).format('YYYY-MM-DD') : null
}

function toDateValue(value) {
  return value ? dayjs(value) : null
}

export default function CQIPage() {
  const [issues, setIssues] = useState([])
  const [actions, setActions] = useState([])
  const [evidence, setEvidence] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [issueOpen, setIssueOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)
  const [editingAction, setEditingAction] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)
  const [issueForm] = Form.useForm()
  const [actionForm] = Form.useForm()
  const [evidenceForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data: issueData, error: issueError } = await supabase.from(issueTable).select('*').order('created_at', { ascending: false })
    if (issueError) message.error(issueError.message)
    setIssues(issueData || [])

    const { data: actionData, error: actionError } = await supabase.from(actionTable).select('*').order('created_at', { ascending: false })
    if (actionError) message.error(actionError.message)
    setActions(actionData || [])

    const { data: evidenceData } = await supabase.from(evidenceTable).select('*').order('uploaded_at', { ascending: false })
    setEvidence(evidenceData || [])

    const { data: followupData } = await supabase.from(followupTable).select('*').order('created_at', { ascending: false })
    setFollowups(followupData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredIssues = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return issues
    return issues.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [issues, keyword])

  const filteredActions = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [actions, keyword])

  const stats = useMemo(() => {
    const open = issues.filter((x) => x.status === 'open').length
    const high = issues.filter((x) => x.severity === 'high').length
    const doing = actions.filter((x) => x.status === 'in_progress').length
    const done = actions.filter((x) => x.status === 'completed').length
    return { open, high, doing, done, issues: issues.length, actions: actions.length }
  }, [issues, actions])

  const openCreateIssue = () => {
    setEditingIssue(null)
    issueForm.setFieldsValue({ code: '', title: '', source_module: 'Outcome Assessment', issue_type: 'PLO chưa đạt', severity: 'medium', academic_year: '2026', semester: 'HK1', description: '', root_cause: '', status: 'open' })
    setIssueOpen(true)
  }

  const openEditIssue = (record) => {
    setEditingIssue(record)
    issueForm.setFieldsValue(record)
    setIssueOpen(true)
  }

  const saveIssue = async () => {
    const values = await issueForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error
    if (editingIssue?.id) {
      const result = await supabase.from(issueTable).update(payload).eq('id', editingIssue.id)
      error = result.error
    } else {
      const result = await supabase.from(issueTable).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }
    if (error) return message.error(error.message)
    message.success(editingIssue ? 'Đã cập nhật vấn đề CQI' : 'Đã thêm vấn đề CQI')
    setIssueOpen(false)
    load()
  }

  const openCreateAction = () => {
    setEditingAction(null)
    actionForm.setFieldsValue({ issue_id: null, code: '', title: '', action_type: 'Cải tiến học phần', solution: '', owner_unit: '', owner_name: '', priority: 'medium', start_date: null, due_date: null, status: 'planned', note: '' })
    setActionOpen(true)
  }

  const openEditAction = (record) => {
    setEditingAction(record)
    actionForm.setFieldsValue({ ...record, start_date: toDateValue(record.start_date), due_date: toDateValue(record.due_date), completed_date: toDateValue(record.completed_date) })
    setActionOpen(true)
  }

  const saveAction = async () => {
    const values = await actionForm.validateFields()
    const payload = { ...values, start_date: dateString(values.start_date), due_date: dateString(values.due_date), completed_date: dateString(values.completed_date), updated_at: new Date().toISOString() }
    let error
    if (editingAction?.id) {
      const result = await supabase.from(actionTable).update(payload).eq('id', editingAction.id)
      error = result.error
    } else {
      const result = await supabase.from(actionTable).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }
    if (error) return message.error(error.message)
    message.success(editingAction ? 'Đã cập nhật hành động cải tiến' : 'Đã thêm hành động cải tiến')
    setActionOpen(false)
    load()
  }

  const saveEvidence = async () => {
    const values = await evidenceForm.validateFields()
    const payload = { ...values, action_id: selectedAction?.id || null, uploaded_at: new Date().toISOString() }
    const { error } = await supabase.from(evidenceTable).insert([payload])
    if (error) return message.error(error.message)
    message.success('Đã thêm minh chứng')
    setEvidenceOpen(false)
    load()
  }

  const remove = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const issueColumns = [
    { title: 'Mã', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Vấn đề', dataIndex: 'title' },
    { title: 'Nguồn', dataIndex: 'source_module' },
    { title: 'Loại', dataIndex: 'issue_type' },
    { title: 'Mức độ', dataIndex: 'severity', render: (v) => <Tag color={v === 'high' ? 'red' : v === 'medium' ? 'gold' : 'green'}>{v}</Tag> },
    { title: 'Năm/HK', render: (_, r) => `${r.academic_year || ''} ${r.semester || ''}` },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'closed' ? 'green' : 'blue'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEditIssue(r)}>Sửa</Button><Popconfirm title="Xóa vấn đề?" onConfirm={() => remove(issueTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const actionColumns = [
    { title: 'Mã', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Hành động cải tiến', dataIndex: 'title' },
    { title: 'Loại', dataIndex: 'action_type' },
    { title: 'Đơn vị', dataIndex: 'owner_unit' },
    { title: 'Người phụ trách', dataIndex: 'owner_name' },
    { title: 'Hạn', dataIndex: 'due_date' },
    { title: 'Ưu tiên', dataIndex: 'priority', render: (v) => <Tag color={v === 'high' ? 'red' : v === 'medium' ? 'gold' : 'green'}>{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : v === 'in_progress' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Thao tác', render: (_, r) => <Space><Button onClick={() => { setSelectedAction(r); evidenceForm.resetFields(); setEvidenceOpen(true) }}>Minh chứng</Button><Button icon={<EditOutlined />} onClick={() => openEditAction(r)}>Sửa</Button><Popconfirm title="Xóa hành động?" onConfirm={() => remove(actionTable, r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Continuous Quality Improvement (CQI)</h1>
    <div className="page-subtitle">Quản lý cải tiến liên tục: phát hiện vấn đề → hành động cải tiến → minh chứng → closing the loop</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Vấn đề mở</div><h2>{stats.open}</h2></Card>
      <Card className="stat-card"><div className="muted">Mức cao</div><h2>{stats.high}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang thực hiện</div><h2>{stats.doing}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoàn thành</div><h2>{stats.done}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm vấn đề, hành động, đơn vị phụ trách..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 460 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('cqi-actions.csv', filteredActions)}>Xuất CSV</Button>
          <Button icon={<PlusOutlined />} onClick={openCreateIssue}>Thêm vấn đề</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateAction}>Thêm hành động</Button>
        </Space>
      </div>
    </Card>

    <Tabs items={[
      { key: 'issues', label: 'Vấn đề chất lượng', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={issueColumns} dataSource={filteredIssues} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'actions', label: 'Hành động cải tiến', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={actionColumns} dataSource={filteredActions} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'loop', label: 'Closing the Loop', children: <Card><Timeline items={actions.slice(0, 8).map((a) => ({ children: `${a.code || ''} - ${a.title || ''} (${a.status || ''})` }))} /></Card> },
      { key: 'evidence', label: 'Minh chứng', children: <Card className="table-card"><Table rowKey="id" dataSource={evidence} columns={[{ title: 'Tên minh chứng', dataIndex: 'title' }, { title: 'Loại', dataIndex: 'evidence_type' }, { title: 'Link', dataIndex: 'file_url' }, { title: 'Người tải', dataIndex: 'uploaded_by' }]} /></Card> },
    ]} />

    <Modal title={editingIssue ? 'Cập nhật vấn đề CQI' : 'Thêm vấn đề CQI'} open={issueOpen} onCancel={() => setIssueOpen(false)} onOk={saveIssue} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={issueForm} layout="vertical"><div className="form-grid">
        <Form.Item name="code" label="Mã vấn đề"><Input /></Form.Item>
        <Form.Item name="title" label="Tên vấn đề" rules={[{ required: true, message: 'Nhập tên vấn đề' }]}><Input /></Form.Item>
        <Form.Item name="source_module" label="Nguồn"><Select options={[{ value: 'Outcome Assessment' }, { value: 'Curriculum Analytics' }, { value: 'AUN-QA' }, { value: 'MOET' }, { value: 'Khác' }]} /></Form.Item>
        <Form.Item name="issue_type" label="Loại vấn đề"><Select options={[{ value: 'PLO chưa đạt' }, { value: 'CLO chưa đạt' }, { value: 'Bloom chưa đạt' }, { value: 'Thiếu minh chứng' }, { value: 'Mapping chưa đầy đủ' }]} /></Form.Item>
        <Form.Item name="severity" label="Mức độ"><Select options={[{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }]} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'open', label: 'Mở' }, { value: 'analyzing', label: 'Đang phân tích' }, { value: 'closed', label: 'Đã đóng' }]} /></Form.Item>
        <Form.Item name="academic_year" label="Năm học"><Input /></Form.Item>
        <Form.Item name="semester" label="Học kỳ"><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="root_cause" label="Nguyên nhân gốc" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={editingAction ? 'Cập nhật hành động cải tiến' : 'Thêm hành động cải tiến'} open={actionOpen} onCancel={() => setActionOpen(false)} onOk={saveAction} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={actionForm} layout="vertical"><div className="form-grid">
        <Form.Item name="issue_id" label="Vấn đề liên quan" className="full"><Select allowClear showSearch optionFilterProp="label" options={issues.map((i) => ({ value: i.id, label: `${i.code || ''} ${i.title || ''}` }))} /></Form.Item>
        <Form.Item name="code" label="Mã hành động"><Input /></Form.Item>
        <Form.Item name="title" label="Tên hành động" rules={[{ required: true, message: 'Nhập tên hành động' }]}><Input /></Form.Item>
        <Form.Item name="action_type" label="Loại"><Select options={[{ value: 'Cải tiến học phần' }, { value: 'Cải tiến rubric' }, { value: 'Tập huấn giảng viên' }, { value: 'Điều chỉnh CTĐT' }, { value: 'Bổ sung minh chứng' }]} /></Form.Item>
        <Form.Item name="priority" label="Ưu tiên"><Select options={[{ value: 'low', label: 'Thấp' }, { value: 'medium', label: 'Trung bình' }, { value: 'high', label: 'Cao' }]} /></Form.Item>
        <Form.Item name="owner_unit" label="Đơn vị phụ trách"><Input /></Form.Item>
        <Form.Item name="owner_name" label="Người phụ trách"><Input /></Form.Item>
        <Form.Item name="start_date" label="Ngày bắt đầu"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="due_date" label="Hạn hoàn thành"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="completed_date" label="Ngày hoàn thành"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'planned', label: 'Dự kiến' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'in_progress', label: 'Đang thực hiện' }, { value: 'completed', label: 'Hoàn thành' }]} /></Form.Item>
        <Form.Item name="solution" label="Giải pháp" className="full"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={2} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={`Minh chứng CQI: ${selectedAction?.code || ''}`} open={evidenceOpen} onCancel={() => setEvidenceOpen(false)} onOk={saveEvidence} okText="Lưu" cancelText="Hủy" width={760}>
      <Form form={evidenceForm} layout="vertical"><div className="form-grid">
        <Form.Item name="title" label="Tên minh chứng" rules={[{ required: true, message: 'Nhập tên minh chứng' }]}><Input /></Form.Item>
        <Form.Item name="evidence_type" label="Loại"><Select options={[{ value: 'Biên bản họp' }, { value: 'Quyết định' }, { value: 'Rubric' }, { value: 'Đề cương' }, { value: 'Báo cáo' }, { value: 'Khác' }]} /></Form.Item>
        <Form.Item name="file_url" label="Link file" className="full"><Input /></Form.Item>
        <Form.Item name="uploaded_by" label="Người tải"><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>
  </>
}
