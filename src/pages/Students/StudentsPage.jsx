import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { label: 'Đang học', value: 'studying' },
  { label: 'Bảo lưu', value: 'paused' },
  { label: 'Đã bảo vệ', value: 'defended' },
  { label: 'Tốt nghiệp', value: 'graduated' },
  { label: 'Thôi học', value: 'withdrawn' },
]

const GENDER_OPTIONS = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
]

const COHORT_OPTIONS = ['2024', '2025', '2026', '2027', '2028'].map((year) => ({ label: year, value: year }))

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function statusTag(status) {
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '—'
  const colorMap = {
    studying: 'green',
    paused: 'orange',
    defended: 'blue',
    graduated: 'purple',
    withdrawn: 'red',
  }
  return <Tag color={colorMap[status] || 'default'}>{label}</Tag>
}

function genderLabel(value) {
  return GENDER_OPTIONS.find((item) => item.value === value)?.label || value || '—'
}

function exportCsv(rows) {
  const headers = ['student_code', 'full_name', 'gender', 'date_of_birth', 'email', 'phone', 'cohort', 'class_name', 'status']
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'danh-sach-hoc-vien-cao-hoc.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function StudentsPage() {
  const [form] = Form.useForm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('id,student_code,full_name,gender,date_of_birth,email,phone,cohort,class_name,status,created_at')
      .order('student_code', { ascending: true })

    if (error) {
      message.error(`Không đọc được dữ liệu học viên: ${error.message}`)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = normalizeText(keyword)
    if (!q) return rows
    return rows.filter((row) =>
      [row.student_code, row.full_name, row.gender, row.email, row.phone, row.cohort, row.class_name, row.status]
        .map(normalizeText)
        .some((value) => value.includes(q)),
    )
  }, [rows, keyword])

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: 'studying', cohort: '2026' })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        student_code: values.student_code?.trim(),
        full_name: values.full_name?.trim(),
        gender: values.gender || null,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        cohort: values.cohort || null,
        class_name: values.class_name?.trim() || null,
        status: values.status || 'studying',
        updated_at: new Date().toISOString(),
      }

      const query = editingRecord
        ? supabase.from('students').update(payload).eq('id', editingRecord.id)
        : supabase.from('students').insert(payload)

      const { error } = await query

      if (error) {
        message.error(`Không lưu được: ${error.message}`)
      } else {
        message.success(editingRecord ? 'Đã cập nhật học viên' : 'Đã thêm học viên')
        setModalOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const { error } = await supabase.from('students').delete().eq('id', record.id)
    if (error) {
      message.error(`Không xóa được: ${error.message}`)
    } else {
      message.success('Đã xóa học viên')
      loadData()
    }
  }

  const columns = [
    {
      title: 'Mã HV',
      dataIndex: 'student_code',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => String(a.student_code).localeCompare(String(b.student_code)),
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      width: 230,
      fixed: 'left',
      render: (value) => <b>{value}</b>,
      sorter: (a, b) => String(a.full_name).localeCompare(String(b.full_name), 'vi'),
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      width: 110,
      render: genderLabel,
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'date_of_birth',
      width: 130,
      render: (value) => value ? dayjs(value).format('DD/MM/YYYY') : <Text type="secondary">—</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 230,
      ellipsis: true,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      width: 140,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Khóa',
      dataIndex: 'cohort',
      width: 110,
      filters: COHORT_OPTIONS.map((item) => ({ text: item.label, value: item.value })),
      onFilter: (value, record) => record.cohort === value,
    },
    {
      title: 'Lớp',
      dataIndex: 'class_name',
      width: 150,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: statusTag,
      filters: STATUS_OPTIONS.map((item) => ({ text: item.label, value: item.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa học viên?"
            description="Thao tác này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header-row">
        <div>
          <Title level={2}>Quản lý học viên cao học</Title>
          <Text type="secondary">Quản lý hồ sơ học viên thạc sĩ, lớp, khóa, trạng thái học tập và thông tin liên hệ.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm học viên
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <UserOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tổng học viên</Text>
              <div className="mini-stat-value">{rows.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <UserOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Đang học</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'studying').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <FileTextOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Bảo lưu</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'paused').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card bordered={false} className="mini-stat-card">
            <FileTextOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tốt nghiệp</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'graduated').length}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã học viên, họ tên, email, khóa, lớp..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 420 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Tải lại
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(filteredRows)}>
            Xuất CSV
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          columns={columns}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Cập nhật học viên cao học' : 'Thêm học viên cao học'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        width={860}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="student_code"
                label="Mã học viên"
                rules={[{ required: true, message: 'Vui lòng nhập mã học viên' }]}
              >
                <Input placeholder="VD: HV001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="full_name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="gender" label="Giới tính">
                <Select allowClear options={GENDER_OPTIONS} placeholder="Chọn giới tính" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="date_of_birth" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cohort" label="Khóa">
                <Select allowClear options={COHORT_OPTIONS} placeholder="Chọn khóa" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="class_name" label="Lớp">
                <Input placeholder="VD: MBA2026A" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Email chưa đúng định dạng' }]}
              >
                <Input placeholder="hocvien@vaa.edu.vn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="Điện thoại">
                <Input placeholder="Số điện thoại" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
