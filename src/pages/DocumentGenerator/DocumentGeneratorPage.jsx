import { DownloadOutlined, FilePdfOutlined, FileWordOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Divider, Empty, Input, Row, Select, Space, Table, Tag, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportLLKHDocx } from '../../utils/llkhDocxExport'
import { exportLLKHPdf } from '../../utils/llkhPdfExport'

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

async function safeSelect(table, query = '*') {
  const { data, error } = await supabase.from(table).select(query)
  if (error) return []
  return data || []
}

export default function DocumentGeneratorPage() {
  const [faculty, setFaculty] = useState([])
  const [selectedFacultyId, setSelectedFacultyId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [data, setData] = useState(null)
  const previewRef = useRef(null)

  const selectedFaculty = useMemo(() => faculty.find((x) => x.id === selectedFacultyId), [faculty, selectedFacultyId])

  const loadFaculty = async () => {
    setLoading(true)
    const { data: facultyData, error } = await supabase.from('faculty').select('*').order('full_name', { ascending: true })
    if (error) message.error(error.message)
    setFaculty(facultyData || [])
    setLoading(false)
  }

  useEffect(() => { loadFaculty() }, [])

  const loadLLKH = async () => {
    if (!selectedFacultyId) return message.warning('Vui lòng chọn giảng viên')
    setLoading(true)

    const profileRows = await safeSelect('ris2_faculty_profiles')
    const educationRows = await safeSelect('ris2_education_history')
    const employmentRows = await safeSelect('ris2_employment_history')
    const languageRows = await safeSelect('ris2_languages')

    const authorRows = await safeSelect('ris2_publication_authors')
    const publicationRows = await safeSelect('ris2_publications')

    const memberRows = await safeSelect('ris2_project_members')
    const projectRows = await safeSelect('ris2_projects')

    const profile = profileRows.find((x) => x.faculty_id === selectedFacultyId) || {}
    const education = educationRows.filter((x) => x.faculty_id === selectedFacultyId)
    const employment = employmentRows.filter((x) => x.faculty_id === selectedFacultyId)
    const languages = languageRows.filter((x) => x.faculty_id === selectedFacultyId)

    const myPublicationIds = authorRows.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.publication_id)
    const publications = publicationRows.filter((x) => myPublicationIds.includes(x.id)).map((p) => {
      const author = authorRows.find((a) => a.publication_id === p.id && a.faculty_id === selectedFacultyId)
      return { ...p, role: author?.role, author_order: author?.author_order, corresponding: author?.corresponding }
    })

    const myProjectIds = memberRows.filter((x) => x.faculty_id === selectedFacultyId).map((x) => x.project_id)
    const projects = projectRows.filter((x) => myProjectIds.includes(x.id)).map((p) => {
      const member = memberRows.find((m) => m.project_id === p.id && m.faculty_id === selectedFacultyId)
      return { ...p, role: member?.role }
    })

    const payload = {
      faculty: selectedFaculty,
      profile,
      education,
      employment,
      languages,
      publications,
      projects,
      supervisionCount: 0,
      councilCount: 0,
      teachingHours: 0,
    }

    setData(payload)
    setLoading(false)
  }

  const downloadDocx = async () => {
    if (!data) return message.warning('Vui lòng bấm Xem trước LLKH trước')
    await exportLLKHDocx(data)
    await supabase.from('document_exports').insert([{ faculty_id: selectedFacultyId, document_type: 'docx', file_name: 'LLKH.docx' }])
  }

  const downloadPdf = async () => {
    if (!data || !previewRef.current) return message.warning('Vui lòng bấm Xem trước LLKH trước')
    await exportLLKHPdf(previewRef.current, pick(data.faculty, ['full_name', 'name'], 'giang_vien'))
    await supabase.from('document_exports').insert([{ faculty_id: selectedFacultyId, document_type: 'pdf', file_name: 'LLKH.pdf' }])
  }

  const filteredFaculty = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return faculty
    return faculty.filter((x) => JSON.stringify(x).toLowerCase().includes(q))
  }, [faculty, keyword])

  const educationColumns = [
    { title: 'Bậc', render: (_, r) => pick(r, ['degree_level', 'level']) },
    { title: 'Trường', render: (_, r) => pick(r, ['institution', 'school']) },
    { title: 'Quốc gia', dataIndex: 'country' },
    { title: 'Ngành/Chuyên ngành', render: (_, r) => pick(r, ['major', 'specialization']) },
  ]

  const publicationColumns = [
    { title: 'Năm', render: (_, r) => pick(r, ['year', 'publication_year']) },
    { title: 'Tên công bố', dataIndex: 'title' },
    { title: 'Tạp chí/NXB', render: (_, r) => pick(r, ['journal', 'publisher']) },
    { title: 'Q', dataIndex: 'quartile', render: (v) => v ? <Tag color={['Q1', 'Q2'].includes(String(v).toUpperCase()) ? 'green' : 'blue'}>{v}</Tag> : '' },
    { title: 'Vai trò', dataIndex: 'role' },
  ]

  const projectColumns = [
    { title: 'Tên đề tài', render: (_, r) => pick(r, ['title', 'project_name']) },
    { title: 'Cấp', render: (_, r) => pick(r, ['level', 'project_level']) },
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Kinh phí', dataIndex: 'budget' },
  ]

  return (
    <>
      <h1 className="page-title">Xuất LLKH Word/PDF</h1>
      <div className="page-subtitle">Xuất file Word (.docx) và PDF riêng, không dùng chức năng in trình duyệt</div>

      <Card className="toolbar-card" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Tìm giảng viên..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%' }}
              showSearch
              allowClear
              placeholder="Chọn giảng viên"
              optionFilterProp="label"
              value={selectedFacultyId}
              onChange={setSelectedFacultyId}
              options={filteredFaculty.map((f) => ({ value: f.id, label: pick(f, ['full_name', 'name'], f.id) }))}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={loadLLKH} loading={loading}>Xem trước LLKH</Button>
              <Button type="primary" icon={<FileWordOutlined />} onClick={downloadDocx}>Tải Word (.docx)</Button>
              <Button icon={<FilePdfOutlined />} onClick={downloadPdf}>Tải PDF</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {!data ? (
        <Card><Empty description="Chọn giảng viên và bấm Xem trước LLKH" /></Card>
      ) : (
        <Card>
          <div ref={previewRef} className="llkh-preview" style={{ background: '#fff', color: '#111', padding: 32, maxWidth: 900, margin: '0 auto', fontFamily: 'Times New Roman, serif' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22 }}>LÝ LỊCH KHOA HỌC</div>
            <Divider />

            <h2>I. Thông tin chung</h2>
            <p><b>Họ và tên:</b> {pick(data.faculty, ['full_name', 'name'])}</p>
            <p><b>Học hàm:</b> {pick(data.faculty, ['academic_rank']) || data.profile.academic_title}</p>
            <p><b>Học vị:</b> {pick(data.faculty, ['degree']) || data.profile.degree}</p>
            <p><b>Đơn vị:</b> {pick(data.faculty, ['department', 'unit']) || data.profile.unit}</p>
            <p><b>Email:</b> {data.faculty.email}</p>
            <p><b>Điện thoại:</b> {data.faculty.phone}</p>
            <p><b>ORCID:</b> {data.faculty.orcid || data.profile.orcid}</p>
            <p><b>Scopus ID:</b> {data.faculty.scopus_id || data.profile.scopus_author_id}</p>
            <p><b>Google Scholar:</b> {data.faculty.google_scholar || data.profile.google_scholar}</p>
            <p><b>Hướng nghiên cứu:</b> {data.profile.research_interests || data.profile.research_fields}</p>

            <h2>II. Quá trình đào tạo</h2>
            <Table size="small" rowKey="id" columns={educationColumns} dataSource={data.education} pagination={false} />

            <h2>III. Quá trình công tác</h2>
            <Table size="small" rowKey="id" columns={[
              { title: 'Từ năm', render: (_, r) => pick(r, ['from_year', 'start_year']) },
              { title: 'Đến năm', render: (_, r) => pick(r, ['to_year', 'end_year']) },
              { title: 'Đơn vị', render: (_, r) => pick(r, ['organization', 'unit']) },
              { title: 'Chức vụ', dataIndex: 'position' },
            ]} dataSource={data.employment} pagination={false} />

            <h2>IV. Ngoại ngữ</h2>
            <Table size="small" rowKey="id" columns={[
              { title: 'Ngoại ngữ', dataIndex: 'language' },
              { title: 'Nghe', render: (_, r) => pick(r, ['listening', 'level']) },
              { title: 'Nói', render: (_, r) => pick(r, ['speaking', 'certificate']) },
              { title: 'Đọc/Viết', render: (_, r) => `${r.reading || ''} ${r.writing || ''}` },
            ]} dataSource={data.languages} pagination={false} />

            <h2>V. Công bố khoa học</h2>
            <Table size="small" rowKey="id" columns={publicationColumns} dataSource={data.publications} pagination={false} />

            <h2>VI. Đề tài nghiên cứu</h2>
            <Table size="small" rowKey="id" columns={projectColumns} dataSource={data.projects} pagination={false} />
          </div>
        </Card>
      )}
    </>
  )
}
