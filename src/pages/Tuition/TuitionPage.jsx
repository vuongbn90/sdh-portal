import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'tuition'

const emptyTuition = {
  code: '',
  student_id: null,
  semester: '',
  academic_year: '',
  amount_due: 0,
  amount_paid: 0,
  due_date: null,
  payment_date: null,
  payment_method: '',
  status: 'unpaid',
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

function money(v) {
  const n = Number(v || 0)
  return n.toLocaleString('vi-VN') + ' đ'
}

export default function TuitionPage() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
    if (error) message.error(error.message)
    setRows(data || [])

    const { data: studentData } = await supabase.from('students').select('*').order('full_name', { ascending: true })
    setStudents(studentData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const totalDue = rows.reduce((s, r) => s + Number(pick(r, ['amount_due'], 0)), 0)
    const totalPaid = rows.reduce((s, r) => s + Number(pick(r, ['amount_paid'], 0)), 0)
    const debt = Math.max(totalDue - totalPaid, 0)
    const unpaid = rows.filter((r) => pick(r, ['status'], 'unpaid') === 'unpaid').length
    return { totalDue, totalPaid, debt, unpaid }
  }, [rows])

  const studentName = (id) => {
    const s = students.find((x) => x.id === id)
    return pick(s, ['full_name', 'name', 'ho_ten'], '')
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyTuition)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      code: pick(record, ['code'], ''),
      student_id: pick(record, ['student_id'], null),
      semester: pick(record, ['semester'], ''),
      academic_year: pick(record, ['academic_year'], ''),
      amount_due: pick(record, ['amount_due'], 0),
      amount_paid: pick(record, ['amount_paid'], 0),
      due_date: toDateValue(pick(record, ['due_date'], null)),
      payment_date: toDateValue(pick(record, ['payment_date'], null)),
      payment_method: pick(record, ['payment_method'], ''),
      status: pick(record, ['status'], 'unpaid'),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      code: values.code || '',
      student_id: values.student_id || null,
      semester: values.semester || '',
      academic_year: values.academic_year || '',
      amount_due: values.amount_due || 0,
      amount_paid: values.amount_paid || 0,
      due_date: dateString(values.due_date),
      payment_date: dateString(values.payment_date),
      payment_method: values.payment_method || '',
      status: values.status || 'unpaid',
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
    message.success(editing ? 'Đã cập nhật học phí' : 'Đã thêm học phí')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa học phí')
    load()
  }

  const columns = [
    { title: 'Mã', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Học viên', dataIndex: 'student_id', render: (id) => studentName(id) || <span className="muted">Chưa gán</span> },
    { title: 'Học kỳ', dataIndex: 'semester' },
    { title: 'Năm học', dataIndex: 'academic_year' },
    { title: 'Phải thu', dataIndex: 'amount_due', align: 'right', render: money },
    { title: 'Đã thu', dataIndex: 'amount_paid', align: 'right', render: money },
    { title: 'Còn nợ', align: 'right', render: (_, r) => money(Number(r.amount_due || 0) - Number(r.amount_paid || 0)) },
    { title: 'Hạn nộp', dataIndex: 'due_date' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'paid' ? 'green' : v === 'partial' ? 'gold' : 'red'}>{v || 'unpaid'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button><Popconfirm title="Xóa dòng học phí này?" onConfirm={() => remove(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  return <>
    <h1 className="page-title">Học phí</h1>
    <div className="page-subtitle">Quản lý công nợ, thanh toán học phí của học viên cao học và nghiên cứu sinh</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Tổng phải thu</div><h2>{money(stats.totalDue)}</h2></Card>
      <Card className="stat-card"><div className="muted">Đã thu</div><h2>{money(stats.totalPaid)}</h2></Card>
      <Card className="stat-card"><div className="muted">Còn nợ</div><h2>{money(stats.debt)}</h2></Card>
      <Card className="stat-card"><div className="muted">Chưa thanh toán</div><h2>{stats.unpaid}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm mã, học viên, học kỳ..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('hoc-phi.csv', filtered)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm học phí</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1300 }} pagination={{ pageSize: 8 }} />
    </Card>

    <Modal title={editing ? 'Cập nhật học phí' : 'Thêm học phí'} open={open} onCancel={() => setOpen(false)} onOk={save} okText="Lưu" cancelText="Hủy" width={820}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="code" label="Mã phiếu" rules={[{ required: true, message: 'Nhập mã phiếu' }]}><Input placeholder="VD: HP-2026-001" /></Form.Item>
          <Form.Item name="student_id" label="Học viên" rules={[{ required: true, message: 'Chọn học viên' }]}><Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: `${pick(s, ['student_code', 'code'], '')} - ${studentName(s.id)}` }))} /></Form.Item>
          <Form.Item name="semester" label="Học kỳ"><Input placeholder="VD: HK1" /></Form.Item>
          <Form.Item name="academic_year" label="Năm học"><Input placeholder="VD: 2026-2027" /></Form.Item>
          <Form.Item name="amount_due" label="Số tiền phải thu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="amount_paid" label="Số tiền đã thu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="due_date" label="Hạn nộp"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="payment_date" label="Ngày thanh toán"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="payment_method" label="Phương thức"><Input placeholder="Chuyển khoản / Tiền mặt" /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'unpaid', label: 'Chưa thanh toán' }, { value: 'partial', label: 'Thanh toán một phần' }, { value: 'paid', label: 'Đã thanh toán' }]} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
    </Modal>
  </>
}
