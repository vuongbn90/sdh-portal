import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const tableName = 'theses'

const emptyThesis = {
  thesis_code: '',
  thesis_type: 'Luận văn',
  title: '',
  title_en: '',
  student_id: null,
  phd_student_id: null,
  supervisor_id: null,
  field: '',
  keywords: '',
  assigned_date: null,
  submitted_at: null,
  defense_date: null,
  plagiarism_score: null,
  ai_score: null,
  final_score: null,
  status: 'draft',
  result: '',
  file_url: '',
  proposal_url: '',
  note: '',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  }
  return fallback
}

function toDateValue(value) {
  if (!value) return null
  return dayjs(value)
}

function toDateString(value) {
  if (!value) return null
  return dayjs(value).format('YYYY-MM-DD')
}

const statusColors = {
  draft: 'default',
  registered: 'blue',
  proposal: 'cyan',
  in_progress: 'processing',
  submitted: 'purple',
  defended: 'green',
  overdue: 'red',
  cancelled: 'default',
}

const statusLabels = {
  draft: 'Nháp',
  registered: 'Đăng ký',
  proposal: 'Đề cương',
  in_progress: 'Đang thực hiện',
  submitted: 'Đã nộp',
  defended: 'Đã bảo vệ',
  overdue: 'Quá hạn',
  cancelled: 'Hủy',
}

export default function ThesisPage() {
  const [rows, setRows] = useState([])
  const [students, setStudents] = useState([])
  const [phdStudents, setPhdStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) message.error(error.message)
    setRows(data || [])

    const [{ data: studentData }, { data: phdData }, { data: facultyData }] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('phd_students').select('*'),
      supabase.from('faculty').select('*'),
    ])

    setStudents(studentData || [])
    setPhdStudents(phdData || [])
    setFaculty(facultyData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, keyword])

  const stats = useMemo(() => {
    const total = rows.length
    const inProgress = rows.filter((r) => ['registered', 'proposal', 'in_progress'].includes(pick(r, ['status'], ''))).length
    const submitted = rows.filter((r) => pick(r, ['status'], '') === 'submitted').length
    const defended = rows.filter((r) => pick(r, ['status'], '') === 'defended').length
    const overdue = rows.filter((r) => pick(r, ['status'], '') === 'overdue').length
    return { total, inProgress, submitted, defended, overdue }
  }, [rows])

  const getStudentName = (record) => {
    const studentId = record.student_id
    const phdId = record.phd_student_id
    const student = students.find((x) => x.id === studentId)
    const phd = phdStudents.find((x) => x.id === phdId)
    return pick(student, ['full_name', 'name', 'ho_ten']) || pick(phd, ['full_name', 'name', 'ho_ten']) || ''
  }

  const getSupervisorName = (id) => {
    const item = faculty.find((x) => x.id === id)
    return pick(item, ['full_name', 'name', 'ho_ten'], '')
  }

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue(emptyThesis)
    setOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      thesis_code: pick(record, ['thesis_code', 'code'], ''),
      thesis_type: pick(record, ['thesis_type', 'type'], 'Luận văn'),
      title: pick(record, ['title'], ''),
      title_en: pick(record, ['title_en'], ''),
      student_id: record.student_id || null,
      phd_student_id: record.phd_student_id || null,
      supervisor_id: record.supervisor_id || null,
      field: pick(record, ['field'], ''),
      keywords: pick(record, ['keywords'], ''),
      assigned_date: toDateValue(record.assigned_date),
      submitted_at: toDateValue(record.submitted_at),
      defense_date: toDateValue(record.defense_date),
      plagiarism_score: record.plagiarism_score,
      ai_score: record.ai_score,
      final_score: record.final_score,
      status: pick(record, ['status'], 'draft'),
      result: pick(record, ['result'], ''),
      file_url: pick(record, ['file_url'], ''),
      proposal_url: pick(record, ['proposal_url'], ''),
      note: pick(record, ['note'], ''),
    })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()

    const payload = {
      thesis_code: values.thesis_code,
      code: values.thesis_code,
      thesis_type: values.thesis_type,
      type: values.thesis_type,
      title: values.title,
      title_en: values.title_en || '',
      student_id: values.student_id || null,
      phd_student_id: values.phd_student_id || null,
      supervisor_id: values.supervisor_id || null,
      field: values.field || '',
      keywords: values.keywords || '',
      assigned_date: toDateString(values.assigned_date),
      submitted_at: values.submitted_at ? dayjs(values.submitted_at).toISOString() : null,
      defense_date: toDateString(values.defense_date),
      plagiarism_score: values.plagiarism_score ?? null,
      ai_score: values.ai_score ?? null,
      final_score: values.final_score ?? null,
      status: values.status || 'draft',
      result: values.result || '',
      file_url: values.file_url || '',
      proposal_url: values.proposal_url || '',
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
    message.success(editing ? 'Đã cập nhật luận văn/luận án' : 'Đã thêm luận văn/luận án')
    setOpen(false)
    load()
  }

  const remove = async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    load()
  }

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'thesis_code',
      width: 140,
      render: (_, r) => <b>{pick(r, ['thesis_code', 'code'], '')}</b>,
    },
    {
      title: 'Tên luận văn/luận án',
      dataIndex: 'title',
      render: (_, r) => (
        <div>
          <b>{pick(r, ['title'])}</b>
          <div className="muted">{pick(r, ['field'], '')}</div>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'thesis_type',
      width: 130,
      render: (_, r) => <Tag color={pick(r, ['thesis_type', 'type'], '').includes('Luận án') ? 'purple' : 'blue'}>{pick(r, ['thesis_type', 'type'], 'Luận văn')}</Tag>,
    },
    {
      title: 'Học viên/NCS',
      dataIndex: 'student_id',
      width: 180,
      render: (_, r) => getStudentName(r) || <span className="muted">Chưa gán</span>,
    },
    {
      title: 'GVHD',
      dataIndex: 'supervisor_id',
      width: 180,
      render: (_, r) => getSupervisorName(r.supervisor_id) || <span className="muted">Chưa gán</span>,
    },
    {
      title: 'Ngày bảo vệ',
      dataIndex: 'defense_date',
      width: 130,
      render: (v) => v || <span className="muted">Chưa có</span>,
    },
    {
      title: 'Điểm',
      dataIndex: 'final_score',
      width: 90,
      align: 'center',
      render: (v) => v ?? <span className="muted">-</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (v) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v || 'Nháp'}</Tag>,
    },
    {
      title: 'File',
      dataIndex: 'file_url',
      width: 90,
      render: (v) => v ? <Button size="small" icon={<FilePdfOutlined />} href={v} target="_blank">Xem</Button> : <span className="muted">-</span>,
    },
    {
      title: 'Thao tác',
      fixed: 'right',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa hồ sơ này?" onConfirm={() => remove(r.id)}>
            <Button danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <h1 className="page-title">Luận văn / Luận án</h1>
      <div className="page-subtitle">Quản lý đề tài, người hướng dẫn, file, tiến độ và kết quả bảo vệ</div>

      <div className="stat-grid">
        <Card className="stat-card"><div className="muted">Tổng hồ sơ</div><h2>{stats.total}</h2></Card>
        <Card className="stat-card"><div className="muted">Đang thực hiện</div><h2>{stats.inProgress}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã nộp</div><h2>{stats.submitted}</h2></Card>
        <Card className="stat-card"><div className="muted">Đã bảo vệ</div><h2>{stats.defended}</h2></Card>
      </div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm mã, tên đề tài, học viên, trạng thái..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 460 }}
          />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('luan-van-luan-an.csv', filtered)}>Xuất CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm hồ sơ</Button>
          </Space>
        </div>
      </Card>

      <Card className="table-card">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} />
      </Card>

      <Modal
        title={editing ? 'Cập nhật luận văn/luận án' : 'Thêm luận văn/luận án'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        okText="Lưu"
        cancelText="Hủy"
        width={920}
      >
        <Form form={form} layout="vertical">
          <div className="form-grid">
            <Form.Item name="thesis_code" label="Mã hồ sơ" rules={[{ required: true, message: 'Nhập mã hồ sơ' }]}>
              <Input placeholder="VD: LV-MBA-001" />
            </Form.Item>
            <Form.Item name="thesis_type" label="Loại">
              <Select options={[{ value: 'Luận văn' }, { value: 'Luận án' }]} />
            </Form.Item>
            <Form.Item name="title" label="Tên đề tài" className="full" rules={[{ required: true, message: 'Nhập tên đề tài' }]}>
              <Input.TextArea rows={2} placeholder="Nhập tên đề tài" />
            </Form.Item>
            <Form.Item name="title_en" label="Tên tiếng Anh" className="full">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="student_id" label="Học viên cao học">
              <Select allowClear showSearch placeholder="Chọn học viên" optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: `${pick(s, ['student_code', 'code'], '')} - ${pick(s, ['full_name', 'name'], '')}` }))} />
            </Form.Item>
            <Form.Item name="phd_student_id" label="Nghiên cứu sinh">
              <Select allowClear showSearch placeholder="Chọn NCS" optionFilterProp="label" options={phdStudents.map((s) => ({ value: s.id, label: `${pick(s, ['phd_code', 'code'], '')} - ${pick(s, ['full_name', 'name'], '')}` }))} />
            </Form.Item>
            <Form.Item name="supervisor_id" label="Người hướng dẫn">
              <Select allowClear showSearch placeholder="Chọn giảng viên" optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: `${pick(f, ['faculty_code', 'code'], '')} - ${pick(f, ['full_name', 'name'], '')}` }))} />
            </Form.Item>
            <Form.Item name="field" label="Lĩnh vực">
              <Input placeholder="VD: Quản trị nguồn nhân lực" />
            </Form.Item>
            <Form.Item name="keywords" label="Từ khóa" className="full">
              <Input placeholder="Nhập từ khóa, cách nhau bằng dấu phẩy" />
            </Form.Item>
            <Form.Item name="assigned_date" label="Ngày giao đề tài">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="submitted_at" label="Ngày nộp">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="defense_date" label="Ngày bảo vệ">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="plagiarism_score" label="Turnitin (%)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ai_score" label="AI Detection (%)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="final_score" label="Điểm cuối cùng">
              <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="result" label="Kết quả">
              <Select allowClear options={[{ value: 'Đạt' }, { value: 'Không đạt' }, { value: 'Chờ bảo vệ' }]} />
            </Form.Item>
            <Form.Item name="proposal_url" label="Link đề cương" className="full">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="file_url" label="Link file luận văn/luận án" className="full">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú" className="full">
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
