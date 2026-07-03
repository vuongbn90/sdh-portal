import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, DatePicker, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'councils'

const emptyCouncil = {
  council_code: '',
  council_name: '',
  council_type: 'Luận văn',
  thesis_id: null,
  decision_no: '',
  decision_date: null,
  defense_date: null,
  room: '',
  online_link: '',
  status: 'planned',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function toDateValue(value) {
  return value ? dayjs(value) : null
}

function dateString(value) {
  if (!value) return null
  return dayjs(value).format('YYYY-MM-DD')
}

export default function CouncilsPage() {
  const [rows, setRows] = useState([])
  const [theses, setTheses] = useState([])
  const [faculty, setFaculty] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedCouncil, setSelectedCouncil] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()
  const [memberForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])

    const { data: thesisData } = await supabase.from('theses').select('*').order('created_at', { ascending: false })
    setTheses(thesisData || [])

    const { data: facultyData } = await supabase.from('faculty').select('*').order('full_name', { ascending: true })
    setFaculty(facultyData || [])

    const { data: memberData } = await supabase.from('council_members').select('*')
    setMembers(memberData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const total = rows.length
    const planned = rows.filter((r) => pick(r, ['status'], 'planned') === 'planned').length
    const completed = rows.filter((r) => pick(r, ['status'], '') === 'completed').length
    const postponed = rows.filter((r) => pick(r, ['status'], '') === 'postponed').length
    return { total, planned, completed, postponed }
  }, [rows])

  const thesisName = (id) => {
    const t = theses.find((x) => x.id === id)
    return pick(t, ['title', 'name', 'ten_de_tai'], '')
  }

  const facultyName = (id) => {
    const f = faculty.find((x) => x.id === id)
    return pick(f, ['full_name', 'name', 'ho_ten'], '')
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyCouncil)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      council_code: pick(record, ['council_code', 'code'], ''),
      council_name: pick(record, ['council_name', 'name'], ''),
      council_type: pick(record, ['council_type', 'type'], 'Luận văn'),
      thesis_id: pick(record, ['thesis_id'], null),
      decision_no: pick(record, ['decision_no'], ''),
      decision_date: toDateValue(pick(record, ['decision_date'], null)),
      defense_date: toDateValue(pick(record, ['defense_date'], null)),
      room: pick(record, ['room'], ''),
      online_link: pick(record, ['online_link'], ''),
      status: pick(record, ['status'], 'planned'),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      code: values.council_code,
      name: values.council_name,
      council_code: values.council_code,
      council_name: values.council_name,
      council_type: values.council_type,
      type: values.council_type,
      thesis_id: values.thesis_id || null,
      decision_no: values.decision_no || '',
      decision_date: dateString(values.decision_date),
      defense_date: dateString(values.defense_date),
      room: values.room || '',
      online_link: values.online_link || '',
      status: values.status,
      note: values.note || '',
      updated_at: new Date().toISOString(),
    }

    let error
    if (editing?.id) {
      ;({ error } = await supabase.from(tableName).update(payload).eq('id', editing.id))
    } else {
      ;({ error } = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }]))
    }
    if (error) return message.error(error.message)
    message.success(editing ? 'Đã cập nhật hội đồng' : 'Đã thêm hội đồng')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa hội đồng')
    load()
  }

  const openMembers = (record) => {
    setSelectedCouncil(record)
    memberForm.resetFields()
    setMemberOpen(true)
  }

  const saveMember = async () => {
    const values = await memberForm.validateFields()
    const payload = {
      council_id: selectedCouncil.id,
      faculty_id: values.faculty_id,
      role: values.role,
      note: values.note || '',
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('council_members').insert([payload])
    if (error) return message.error(error.message)
    message.success('Đã thêm thành viên hội đồng')
    memberForm.resetFields()
    load()
  }

  const removeMember = async (id) => {
    const { error } = await supabase.from('council_members').delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa thành viên')
    load()
  }

  const columns = [
    { title: 'Mã HĐ', dataIndex: 'council_code', render: (_, r) => <b>{pick(r, ['council_code', 'code'])}</b> },
    { title: 'Tên hội đồng', dataIndex: 'council_name', render: (_, r) => pick(r, ['council_name', 'name']) },
    { title: 'Loại', dataIndex: 'council_type', render: (_, r) => <Tag color="blue">{pick(r, ['council_type', 'type'], 'Luận văn')}</Tag> },
    { title: 'Luận văn/Luận án', dataIndex: 'thesis_id', render: (_, r) => thesisName(r.thesis_id) || <span className="muted">Chưa gán</span> },
    { title: 'Ngày bảo vệ', dataIndex: 'defense_date' },
    { title: 'Phòng', dataIndex: 'room' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : v === 'postponed' ? 'red' : 'gold'}>{v || 'planned'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button onClick={() => openMembers(r)}>Thành viên</Button><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa hội đồng này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const memberColumns = [
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id) => facultyName(id) },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', render: (_, r) => <Popconfirm title="Xóa thành viên?" onConfirm={() => removeMember(r.id)}><Button danger size="small">Xóa</Button></Popconfirm> },
  ]

  const selectedMembers = members.filter((m) => m.council_id === selectedCouncil?.id)

  return <>
    <h1 className="page-title">Hội đồng</h1>
    <div className="page-subtitle">Quản lý hội đồng bảo vệ luận văn, luận án, thành viên và lịch bảo vệ</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng hội đồng</div><h2>{stats.total}</h2></Card>
      <Card className="stat-card"><div className="muted">Dự kiến</div><h2>{stats.planned}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoàn thành</div><h2>{stats.completed}</h2></Card>
      <Card className="stat-card"><div className="muted">Hoãn</div><h2>{stats.postponed}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã, tên hội đồng, luận văn..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('hoi-dong.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm hội đồng</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật hội đồng' : 'Thêm hội đồng'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="council_code" label="Mã hội đồng" rules={[{ required: true, message: 'Nhập mã hội đồng' }]}><Input placeholder="VD: HD-LV-001" /></Form.Item>
          <Form.Item name="council_name" label="Tên hội đồng" rules={[{ required: true, message: 'Nhập tên hội đồng' }]}><Input placeholder="VD: Hội đồng bảo vệ luận văn MBA" /></Form.Item>
          <Form.Item name="council_type" label="Loại hội đồng"><Select options={[{ value: 'Luận văn' }, { value: 'Luận án' }, { value: 'Đề cương' }, { value: 'Seminar' }]} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'planned', label: 'Dự kiến' }, { value: 'scheduled', label: 'Đã lên lịch' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'postponed', label: 'Hoãn' }]} /></Form.Item>
          <Form.Item name="thesis_id" label="Luận văn/Luận án" className="full"><Select allowClear showSearch placeholder="Chọn luận văn/luận án" optionFilterProp="label" options={theses.map((t) => ({ value: t.id, label: pick(t, ['title', 'name'], t.id) }))} /></Form.Item>
          <Form.Item name="decision_no" label="Số quyết định"><Input /></Form.Item>
          <Form.Item name="decision_date" label="Ngày quyết định"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="defense_date" label="Ngày bảo vệ"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="room" label="Phòng"><Input placeholder="VD: A101" /></Form.Item>
          <Form.Item name="online_link" label="Link trực tuyến"><Input placeholder="Zoom/Google Meet" /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>

    <Modal title={`Thành viên hội đồng: ${pick(selectedCouncil, ['council_code', 'code'], '')}`} open={memberOpen} onCancel={() => setMemberOpen(false)} footer={null} width={900}>
      <Form form={memberForm} layout="vertical" onFinish={saveMember}>
        <div className="form-grid">
          <Form.Item name="faculty_id" label="Giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]}>
            <Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: pick(f, ['full_name', 'name'], f.id) }))} />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select options={[{ value: 'Chủ tịch' }, { value: 'Thư ký' }, { value: 'Phản biện 1' }, { value: 'Phản biện 2' }, { value: 'Ủy viên' }, { value: 'Khách mời' }]} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Form.Item label=" "><Button type="primary" htmlType="submit">Thêm thành viên</Button></Form.Item>
        </div>
      </Form>
      <Table rowKey="id" columns={memberColumns} dataSource={selectedMembers} pagination={false} />
    </Modal>
  </>
}
