import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
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
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Tạm ngưng', value: 'inactive' },
  { label: 'Nghỉ hưu', value: 'retired' },
]

const DEGREE_OPTIONS = [
  { label: 'Tiến sĩ', value: 'Tiến sĩ' },
  { label: 'Thạc sĩ', value: 'Thạc sĩ' },
  { label: 'Cử nhân', value: 'Cử nhân' },
]

const RANK_OPTIONS = [
  { label: 'Giáo sư', value: 'GS' },
  { label: 'Phó giáo sư', value: 'PGS' },
]

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function exportCsv(rows) {
  const headers = ['faculty_code', 'full_name', 'degree', 'academic_rank', 'email', 'phone', 'status']
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'danh-sach-giang-vien.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function FacultyPage() {
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
      .from('faculty')
      .select('id,faculty_code,full_name,degree,academic_rank,email,phone,scopus_id,orcid,google_scholar,status,created_at')
      .order('faculty_code', { ascending: true })

    if (error) {
      message.error(`Không đọc được dữ liệu giảng viên: ${error.message}`)
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
      [row.faculty_code, row.full_name, row.email, row.phone, row.degree, row.academic_rank, row.status]
        .map(normalizeText)
        .some((value) => value.includes(q)),
    )
  }, [rows, keyword])

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active', degree: 'Tiến sĩ' })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        faculty_code: values.faculty_code?.trim(),
        full_name: values.full_name?.trim(),
        degree: values.degree || null,
        academic_rank: values.academic_rank || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        scopus_id: values.scopus_id?.trim() || null,
        orcid: values.orcid?.trim() || null,
        google_scholar: values.google_scholar?.trim() || null,
        status: values.status || 'active',
        updated_at: new Date().toISOString(),
      }

      const query = editingRecord
        ? supabase.from('faculty').update(payload).eq('id', editingRecord.id)
        : supabase.from('faculty').insert(payload)

      const { error } = await query

      if (error) {
        message.error(`Không lưu được: ${error.message}`)
      } else {
        message.success(editingRecord ? 'Đã cập nhật giảng viên' : 'Đã thêm giảng viên')
        setModalOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const { error } = await supabase.from('faculty').delete().eq('id', record.id)
    if (error) {
      message.error(`Không xóa được: ${error.message}`)
    } else {
      message.success('Đã xóa giảng viên')
      loadData()
    }
  }

  const columns = [
    {
      title: 'Mã GV',
      dataIndex: 'faculty_code',
      width: 110,
      fixed: 'left',
      sorter: (a, b) => String(a.faculty_code).localeCompare(String(b.faculty_code)),
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      width: 220,
      fixed: 'left',
      render: (value) => <b>{value}</b>,
      sorter: (a, b) => String(a.full_name).localeCompare(String(b.full_name), 'vi'),
    },
    {
      title: 'Học vị',
      dataIndex: 'degree',
      width: 120,
    },
    {
      title: 'Học hàm',
      dataIndex: 'academic_rank',
      width: 120,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 240,
      ellipsis: true,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      width: 140,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Scopus ID',
      dataIndex: 'scopus_id',
      width: 150,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'ORCID',
      dataIndex: 'orcid',
      width: 170,
      render: (value) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status) => {
        const color = status === 'active' ? 'green' : status === 'retired' ? 'purple' : 'orange'
        const label = STATUS_OPTIONS.find((item) => item.value === status)?.label || status
        return <Tag color={color}>{label}</Tag>
      },
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
            title="Xóa giảng viên?"
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
          <Title level={2}>Quản lý giảng viên</Title>
          <Text type="secondary">Quản lý hồ sơ giảng viên, học hàm, học vị, email và định danh khoa học.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm giảng viên
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <UserOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Tổng giảng viên</Text>
              <div className="mini-stat-value">{rows.length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <UserOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">Đang hoạt động</Text>
              <div className="mini-stat-value">{rows.filter((r) => r.status === 'active').length}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="mini-stat-card">
            <UserOutlined className="mini-stat-icon" />
            <div>
              <Text type="secondary">PGS/GS</Text>
              <div className="mini-stat-value">{rows.filter((r) => ['PGS', 'GS'].includes(r.academic_rank)).length}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã, họ tên, email, học vị..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 360 }}
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
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Cập nhật giảng viên' : 'Thêm giảng viên'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        width={820}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="faculty_code"
                label="Mã giảng viên"
                rules={[{ required: true, message: 'Vui lòng nhập mã giảng viên' }]}
              >
                <Input placeholder="VD: GV001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="full_name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="VD: Bùi Nhất Vương" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="degree" label="Học vị">
                <Select allowClear options={DEGREE_OPTIONS} placeholder="Chọn học vị" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="academic_rank" label="Học hàm">
                <Select allowClear options={RANK_OPTIONS} placeholder="Chọn học hàm" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Email chưa đúng định dạng' }]}
              >
                <Input placeholder="email@vaa.edu.vn" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Điện thoại">
                <Input placeholder="Số điện thoại" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="scopus_id" label="Scopus ID">
                <Input placeholder="Scopus Author ID" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="orcid" label="ORCID">
                <Input placeholder="0000-0000-0000-0000" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="google_scholar" label="Google Scholar">
                <Input placeholder="Link hồ sơ" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
