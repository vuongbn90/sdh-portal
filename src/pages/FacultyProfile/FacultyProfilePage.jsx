import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileAddOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
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
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const tables = {
  faculty: 'faculty',
  education: 'faculty_education',
  employment: 'faculty_employment',
  languages: 'faculty_languages',
  certificates: 'faculty_certificates',
  awards: 'faculty_awards',
  documents: 'faculty_documents',
}

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

function normalizeDate(value) {
  if (!value) return null
  if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD')
  return value
}

function toDatePickerValue(value) {
  return value ? dayjs(value) : null
}

export default function FacultyProfilePage() {
  const [faculty, setFaculty] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [activeModal, setActiveModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [education, setEducation] = useState([])
  const [employment, setEmployment] = useState([])
  const [languages, setLanguages] = useState([])
  const [certificates, setCertificates] = useState([])
  const [awards, setAwards] = useState([])
  const [documents, setDocuments] = useState([])
  const [profileForm] = Form.useForm()
  const [childForm] = Form.useForm()

  const currentFaculty = useMemo(
    () => faculty.find((item) => item.id === selectedFacultyId) || null,
    [faculty, selectedFacultyId],
  )

  const facultyOptions = faculty.map((f) => ({
    value: f.id,
    label: `${pick(f, ['faculty_code'], '') ? `${pick(f, ['faculty_code'], '')} - ` : ''}${pick(f, ['full_name', 'name'], '')}`,
  }))

  const load = async () => {
    setLoading(true)
    const { data: facultyData, error: facultyError } = await supabase
      .from(tables.faculty)
      .select('*')
      .order('full_name', { ascending: true })

    if (facultyError) message.error(facultyError.message)
    const list = facultyData || []
    setFaculty(list)

    const nextFacultyId = selectedFacultyId || list[0]?.id || null
    if (!selectedFacultyId && nextFacultyId) setSelectedFacultyId(nextFacultyId)

    if (nextFacultyId) await loadDetails(nextFacultyId)
    setLoading(false)
  }

  const loadDetails = async (facultyId) => {
    const [edu, emp, lang, cert, award, doc] = await Promise.all([
      supabase.from(tables.education).select('*').eq('faculty_id', facultyId).order('from_year', { ascending: false }),
      supabase.from(tables.employment).select('*').eq('faculty_id', facultyId).order('from_date', { ascending: false }),
      supabase.from(tables.languages).select('*').eq('faculty_id', facultyId).order('language', { ascending: true }),
      supabase.from(tables.certificates).select('*').eq('faculty_id', facultyId).order('issue_date', { ascending: false }),
      supabase.from(tables.awards).select('*').eq('faculty_id', facultyId).order('award_date', { ascending: false }),
      supabase.from(tables.documents).select('*').eq('faculty_id', facultyId).order('uploaded_at', { ascending: false }),
    ])

    ;[edu, emp, lang, cert, award, doc].forEach((result) => {
      if (result.error) message.error(result.error.message)
    })

    setEducation(edu.data || [])
    setEmployment(emp.data || [])
    setLanguages(lang.data || [])
    setCertificates(cert.data || [])
    setAwards(award.data || [])
    setDocuments(doc.data || [])
  }

  useEffect(() => { load() }, [])

  const onSelectFaculty = async (facultyId) => {
    setSelectedFacultyId(facultyId)
    setLoading(true)
    await loadDetails(facultyId)
    setLoading(false)
  }

  const openProfile = () => {
    profileForm.setFieldsValue(currentFaculty || {})
    setActiveModal('profile')
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    const protectedFields = ['faculty_code', 'full_name', 'name', 'id', 'created_at']
    protectedFields.forEach((key) => delete values[key])

    const { error } = await supabase
      .from(tables.faculty)
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', selectedFacultyId)

    if (error) return message.error(error.message)
    message.success('Đã cập nhật hồ sơ giảng viên')
    setActiveModal(null)
    await load()
  }

  const openChild = (type, record = null) => {
    setEditing(record)
    setActiveModal(type)
    childForm.resetFields()

    const value = record ? { ...record } : {}
    ;['from_date', 'to_date', 'issue_date', 'expiry_date', 'award_date'].forEach((field) => {
      if (value[field]) value[field] = toDatePickerValue(value[field])
    })
    childForm.setFieldsValue(value)
  }

  const saveChild = async (type) => {
    const values = await childForm.validateFields()
    ;['from_date', 'to_date', 'issue_date', 'expiry_date', 'award_date'].forEach((field) => {
      if (values[field]) values[field] = normalizeDate(values[field])
    })

    const table = modalTableMap[type]
    const payload = {
      ...values,
      faculty_id: selectedFacultyId,
      updated_at: new Date().toISOString(),
    }

    let result
    if (editing?.id) result = await supabase.from(table).update(payload).eq('id', editing.id)
    else result = await supabase.from(table).insert([{ ...payload, created_at: new Date().toISOString() }])

    if (result.error) return message.error(result.error.message)
    message.success('Đã lưu')
    setActiveModal(null)
    setEditing(null)
    await loadDetails(selectedFacultyId)
  }

  const removeChild = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa')
    await loadDetails(selectedFacultyId)
  }

  const filteredFaculty = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return faculty
    return faculty.filter((f) => JSON.stringify(f).toLowerCase().includes(q))
  }, [faculty, keyword])

  const profileStats = {
    education: education.length,
    employment: employment.length,
    languages: languages.length,
    documents: documents.length,
  }

  const facultyColumns = [
    { title: 'Mã GV', dataIndex: 'faculty_code', width: 110 },
    { title: 'Họ tên', dataIndex: 'full_name', render: (v, r) => <b>{pick(r, ['full_name', 'name'], v)}</b> },
    { title: 'Học hàm', dataIndex: 'academic_rank', width: 120 },
    { title: 'Học vị', dataIndex: 'degree', width: 120 },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Điện thoại', dataIndex: 'phone', width: 130 },
    { title: 'Thao tác', width: 120, render: (_, r) => <Button onClick={() => onSelectFaculty(r.id)}>Mở hồ sơ</Button> },
  ]

  return (
    <>
      <Title level={2} className="page-title">Faculty Profile & Academic CV</Title>
      <div className="page-subtitle">Quản lý hồ sơ giảng viên, quá trình đào tạo, công tác, ngoại ngữ, chứng chỉ, giải thưởng và hồ sơ số.</div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Select
            showSearch
            optionFilterProp="label"
            value={selectedFacultyId}
            onChange={onSelectFaculty}
            options={facultyOptions}
            placeholder="Chọn giảng viên"
            style={{ minWidth: 380 }}
          />
          <Space>
            <Input prefix={<SearchOutlined />} placeholder="Tìm giảng viên..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 280 }} />
            <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportCsv('faculty-profile.csv', filteredFaculty)}>Xuất CSV</Button>
          </Space>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space align="start" size="large" wrap>
          <Avatar size={96} src={currentFaculty?.avatar_url} icon={<UserOutlined />} />
          <div style={{ minWidth: 300 }}>
            <Title level={3} style={{ marginBottom: 4 }}>{pick(currentFaculty, ['full_name', 'name'], 'Chưa chọn giảng viên')}</Title>
            <Text type="secondary">{pick(currentFaculty, ['faculty_code'], '')}</Text><br />
            <Text>{pick(currentFaculty, ['academic_rank'], '')} {pick(currentFaculty, ['degree'], '')}</Text><br />
            <Text>Email: {pick(currentFaculty, ['email'], '')}</Text><br />
            <Text>Điện thoại: {pick(currentFaculty, ['phone'], '')}</Text>
          </div>
          <Space>
            <Button type="primary" icon={<EditOutlined />} onClick={openProfile} disabled={!selectedFacultyId}>Cập nhật hồ sơ</Button>
          </Space>
        </Space>
      </Card>

      <div className="stat-grid">
        <Card className="stat-card"><Statistic title="Quá trình đào tạo" value={profileStats.education} /></Card>
        <Card className="stat-card"><Statistic title="Quá trình công tác" value={profileStats.employment} /></Card>
        <Card className="stat-card"><Statistic title="Ngoại ngữ" value={profileStats.languages} /></Card>
        <Card className="stat-card"><Statistic title="Hồ sơ số" value={profileStats.documents} /></Card>
      </div>

      <Tabs items={[
        {
          key: 'faculty-list',
          label: 'Danh sách giảng viên',
          children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={facultyColumns} dataSource={filteredFaculty} pagination={{ pageSize: 8 }} scroll={{ x: 1000 }} /></Card>,
        },
        {
          key: 'profile',
          label: 'Thông tin cá nhân',
          children: <ProfileInfo faculty={currentFaculty} />,
        },
        {
          key: 'education',
          label: 'Quá trình đào tạo',
          children: <DataTab loading={loading} data={education} columns={educationColumns(openChild, removeChild)} onAdd={() => openChild('education')} onExport={() => exportCsv('faculty-education.csv', education)} />,
        },
        {
          key: 'employment',
          label: 'Quá trình công tác',
          children: <DataTab loading={loading} data={employment} columns={employmentColumns(openChild, removeChild)} onAdd={() => openChild('employment')} onExport={() => exportCsv('faculty-employment.csv', employment)} />,
        },
        {
          key: 'languages',
          label: 'Ngoại ngữ',
          children: <DataTab loading={loading} data={languages} columns={languageColumns(openChild, removeChild)} onAdd={() => openChild('language')} onExport={() => exportCsv('faculty-languages.csv', languages)} />,
        },
        {
          key: 'certificates',
          label: 'Chứng chỉ',
          children: <DataTab loading={loading} data={certificates} columns={certificateColumns(openChild, removeChild)} onAdd={() => openChild('certificate')} onExport={() => exportCsv('faculty-certificates.csv', certificates)} />,
        },
        {
          key: 'awards',
          label: 'Giải thưởng',
          children: <DataTab loading={loading} data={awards} columns={awardColumns(openChild, removeChild)} onAdd={() => openChild('award')} onExport={() => exportCsv('faculty-awards.csv', awards)} />,
        },
        {
          key: 'documents',
          label: 'Hồ sơ số',
          children: <DataTab loading={loading} data={documents} columns={documentColumns(openChild, removeChild)} onAdd={() => openChild('document')} onExport={() => exportCsv('faculty-documents.csv', documents)} />,
        },
      ]} />

      <ProfileModal open={activeModal === 'profile'} onCancel={() => setActiveModal(null)} onOk={saveProfile} form={profileForm} />
      <ChildModal type={activeModal} open={!!activeModal && activeModal !== 'profile'} onCancel={() => setActiveModal(null)} onOk={() => saveChild(activeModal)} form={childForm} />
    </>
  )
}

const modalTableMap = {
  education: tables.education,
  employment: tables.employment,
  language: tables.languages,
  certificate: tables.certificates,
  award: tables.awards,
  document: tables.documents,
}

function ProfileInfo({ faculty }) {
  const rows = [
    ['Mã giảng viên', pick(faculty, ['faculty_code'], '')],
    ['Họ tên', pick(faculty, ['full_name', 'name'], '')],
    ['Học hàm', pick(faculty, ['academic_rank'], '')],
    ['Học vị', pick(faculty, ['degree'], '')],
    ['Email', pick(faculty, ['email'], '')],
    ['Điện thoại', pick(faculty, ['phone'], '')],
    ['ORCID', pick(faculty, ['orcid'], '')],
    ['Scopus ID', pick(faculty, ['scopus_id'], '')],
    ['Google Scholar', pick(faculty, ['google_scholar'], '')],
    ['WoS Researcher ID', pick(faculty, ['wos_researcher_id'], '')],
    ['Website cá nhân', pick(faculty, ['personal_website'], '')],
    ['Chuyên môn', pick(faculty, ['specialization'], '')],
    ['Hướng nghiên cứu', pick(faculty, ['research_interests'], '')],
    ['Tiểu sử khoa học', pick(faculty, ['biography'], '')],
  ]
  return <Card><Table rowKey={(r) => r[0]} showHeader={false} pagination={false} columns={[{ dataIndex: 0, width: 220, render: (v) => <b>{v}</b> }, { dataIndex: 1 }]} dataSource={rows} /></Card>
}

function DataTab({ loading, data, columns, onAdd, onExport }) {
  return (
    <>
      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Thêm</Button>
          <Button icon={<DownloadOutlined />} onClick={onExport}>Xuất CSV</Button>
        </Space>
      </Card>
      <Card className="table-card">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} />
      </Card>
    </>
  )
}

function Actions({ onEdit, onDelete }) {
  return <Space><Button icon={<EditOutlined />} onClick={onEdit}>Sửa</Button><Popconfirm title="Xóa dòng này?" onConfirm={onDelete}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space>
}

function educationColumns(openChild, removeChild) {
  return [
    { title: 'Từ năm', dataIndex: 'from_year', width: 100 },
    { title: 'Đến năm', dataIndex: 'to_year', width: 100 },
    { title: 'Trường', dataIndex: 'institution' },
    { title: 'Quốc gia', dataIndex: 'country', width: 120 },
    { title: 'Bậc/Văn bằng', dataIndex: 'degree', width: 150 },
    { title: 'Ngành', dataIndex: 'major' },
    { title: 'Chuyên ngành', dataIndex: 'specialization' },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('education', r)} onDelete={() => removeChild(tables.education, r.id)} /> },
  ]
}
function employmentColumns(openChild, removeChild) {
  return [
    { title: 'Từ ngày', dataIndex: 'from_date', width: 120 },
    { title: 'Đến ngày', dataIndex: 'to_date', width: 120 },
    { title: 'Đơn vị', dataIndex: 'organization' },
    { title: 'Bộ môn', dataIndex: 'department' },
    { title: 'Chức vụ', dataIndex: 'position' },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('employment', r)} onDelete={() => removeChild(tables.employment, r.id)} /> },
  ]
}
function languageColumns(openChild, removeChild) {
  return [
    { title: 'Ngoại ngữ', dataIndex: 'language' },
    { title: 'Trình độ', dataIndex: 'level' },
    { title: 'Chứng chỉ', dataIndex: 'certificate' },
    { title: 'Điểm', dataIndex: 'score', width: 100 },
    { title: 'Ngày cấp', dataIndex: 'issue_date', width: 120 },
    { title: 'Hết hạn', dataIndex: 'expiry_date', width: 120 },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('language', r)} onDelete={() => removeChild(tables.languages, r.id)} /> },
  ]
}
function certificateColumns(openChild, removeChild) {
  return [
    { title: 'Tên chứng chỉ', dataIndex: 'certificate_name' },
    { title: 'Đơn vị cấp', dataIndex: 'issuer' },
    { title: 'Số hiệu', dataIndex: 'certificate_no' },
    { title: 'Ngày cấp', dataIndex: 'issue_date' },
    { title: 'Hết hạn', dataIndex: 'expiry_date' },
    { title: 'File', dataIndex: 'file_url', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">Mở</a> : '' },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('certificate', r)} onDelete={() => removeChild(tables.certificates, r.id)} /> },
  ]
}
function awardColumns(openChild, removeChild) {
  return [
    { title: 'Tên giải thưởng', dataIndex: 'award_name' },
    { title: 'Đơn vị', dataIndex: 'organization' },
    { title: 'Ngày', dataIndex: 'award_date' },
    { title: 'Mô tả', dataIndex: 'description' },
    { title: 'File', dataIndex: 'file_url', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">Mở</a> : '' },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('award', r)} onDelete={() => removeChild(tables.awards, r.id)} /> },
  ]
}
function documentColumns(openChild, removeChild) {
  return [
    { title: 'Loại tài liệu', dataIndex: 'document_type', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Tên file', dataIndex: 'file_name' },
    { title: 'Link', dataIndex: 'file_url', render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">Mở file</a> : '' },
    { title: 'Ghi chú', dataIndex: 'note' },
    { title: 'Thao tác', width: 160, render: (_, r) => <Actions onEdit={() => openChild('document', r)} onDelete={() => removeChild(tables.documents, r.id)} /> },
  ]
}

function ProfileModal({ open, onCancel, onOk, form }) {
  return (
    <Modal title="Cập nhật hồ sơ giảng viên" open={open} onCancel={onCancel} onOk={onOk} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical">
        <div className="form-grid">
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="academic_rank" label="Học hàm"><Input /></Form.Item>
          <Form.Item name="degree" label="Học vị"><Input /></Form.Item>
          <Form.Item name="avatar_url" label="Ảnh đại diện URL"><Input /></Form.Item>
          <Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item>
          <Form.Item name="orcid" label="ORCID"><Input /></Form.Item>
          <Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item>
          <Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item>
          <Form.Item name="wos_researcher_id" label="WoS Researcher ID"><Input /></Form.Item>
          <Form.Item name="researchgate" label="ResearchGate"><Input /></Form.Item>
          <Form.Item name="personal_website" label="Website cá nhân"><Input /></Form.Item>
          <Form.Item name="research_interests" label="Hướng nghiên cứu" className="full"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="biography" label="Tiểu sử khoa học" className="full"><Input.TextArea rows={4} /></Form.Item>
        </div>
      </Form>
    </Modal>
  )
}

function ChildModal({ type, open, onCancel, onOk, form }) {
  const titleMap = {
    education: 'Quá trình đào tạo', employment: 'Quá trình công tác', language: 'Ngoại ngữ', certificate: 'Chứng chỉ', award: 'Giải thưởng', document: 'Hồ sơ số',
  }
  return (
    <Modal title={titleMap[type] || ''} open={open} onCancel={onCancel} onOk={onOk} okText="Lưu" cancelText="Hủy" width={900}>
      <Form form={form} layout="vertical">
        {type === 'education' && <div className="form-grid">
          <Form.Item name="from_year" label="Từ năm"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="to_year" label="Đến năm"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="institution" label="Trường/Viện"><Input /></Form.Item>
          <Form.Item name="country" label="Quốc gia"><Input /></Form.Item>
          <Form.Item name="degree" label="Bậc/Văn bằng"><Select options={[{ value: 'Đại học' }, { value: 'Thạc sĩ' }, { value: 'Tiến sĩ' }, { value: 'Sau tiến sĩ' }, { value: 'Khác' }]} /></Form.Item>
          <Form.Item name="major" label="Ngành"><Input /></Form.Item>
          <Form.Item name="specialization" label="Chuyên ngành"><Input /></Form.Item>
          <Form.Item name="thesis_title" label="Tên luận văn/luận án" className="full"><Input /></Form.Item>
        </div>}
        {type === 'employment' && <div className="form-grid">
          <Form.Item name="from_date" label="Từ ngày"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="to_date" label="Đến ngày"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="organization" label="Đơn vị"><Input /></Form.Item>
          <Form.Item name="department" label="Bộ môn/Phòng"><Input /></Form.Item>
          <Form.Item name="position" label="Chức vụ"><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>}
        {type === 'language' && <div className="form-grid">
          <Form.Item name="language" label="Ngoại ngữ"><Input /></Form.Item>
          <Form.Item name="level" label="Trình độ"><Input placeholder="VD: B2, C1, IELTS 7.0" /></Form.Item>
          <Form.Item name="certificate" label="Chứng chỉ"><Input /></Form.Item>
          <Form.Item name="score" label="Điểm"><Input /></Form.Item>
          <Form.Item name="issue_date" label="Ngày cấp"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="expiry_date" label="Hết hạn"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </div>}
        {type === 'certificate' && <div className="form-grid">
          <Form.Item name="certificate_name" label="Tên chứng chỉ"><Input /></Form.Item>
          <Form.Item name="issuer" label="Đơn vị cấp"><Input /></Form.Item>
          <Form.Item name="certificate_no" label="Số hiệu"><Input /></Form.Item>
          <Form.Item name="issue_date" label="Ngày cấp"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="expiry_date" label="Hết hạn"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="file_url" label="Link minh chứng" className="full"><Input /></Form.Item>
        </div>}
        {type === 'award' && <div className="form-grid">
          <Form.Item name="award_name" label="Tên giải thưởng"><Input /></Form.Item>
          <Form.Item name="organization" label="Đơn vị trao"><Input /></Form.Item>
          <Form.Item name="award_date" label="Ngày"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="file_url" label="Link minh chứng"><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>}
        {type === 'document' && <div className="form-grid">
          <Form.Item name="document_type" label="Loại tài liệu"><Select options={[{ value: 'CV' }, { value: 'Bằng cấp' }, { value: 'Chứng chỉ' }, { value: 'Ảnh' }, { value: 'Chữ ký' }, { value: 'Minh chứng khác' }]} /></Form.Item>
          <Form.Item name="file_name" label="Tên file"><Input /></Form.Item>
          <Form.Item name="file_url" label="Link file" className="full"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
        </div>}
      </Form>
    </Modal>
  )
}
