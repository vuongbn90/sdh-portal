import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import {
  deleteSyllabus,
  getSyllabusBundle,
  listSyllabi,
  loadCatalogs,
  saveSyllabusBundle,
} from '../../services/courseSyllabusService.js'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const statusOptions = [
  { value: 'draft', label: 'Nháp' },
  { value: 'submitted', label: 'Đã gửi duyệt' },
  { value: 'approved', label: 'Đã phê duyệt' },
  { value: 'published', label: 'Công bố' },
]

const courseTypeOptions = ['Bắt buộc', 'Tự chọn'].map((value) => ({ value, label: value }))
const knowledgeBlockOptions = [
  'Kiến thức đại cương',
  'Kiến thức cơ bản',
  'Kiến thức cơ sở ngành',
  'Kiến thức chuyên ngành',
  'Kiến thức khác',
  'Học phần chuyên về kỹ năng chung',
  'Học phần khóa luận/luận văn tốt nghiệp',
].map((value) => ({ value, label: value }))
const bloomOptions = ['1', '2', '3', '4', '5', '6'].map((value) => ({ value, label: value }))
const levelOptions = ['H', 'M', 'L'].map((value) => ({ value, label: value }))

function newRow(prefix = 'tmp') {
  return { id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

function EditableTable({ columns, data, setData, addText = 'Thêm dòng' }) {
  const update = (id, field, value) => setData(data.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  const remove = (id) => setData(data.filter((row) => row.id !== id))
  const tableColumns = columns.map((col) => ({
    ...col,
    render: (_, record) => {
      const value = record[col.dataIndex]
      if (col.type === 'number') {
        return <InputNumber value={value} min={0} style={{ width: '100%' }} onChange={(v) => update(record.id, col.dataIndex, v)} />
      }
      if (col.type === 'select') {
        return <Select value={value} allowClear options={col.options || []} style={{ width: '100%' }} onChange={(v) => update(record.id, col.dataIndex, v)} />
      }
      if (col.type === 'textarea') {
        return <TextArea value={value} autoSize={{ minRows: 1, maxRows: 6 }} onChange={(e) => update(record.id, col.dataIndex, e.target.value)} />
      }
      return <Input value={value} onChange={(e) => update(record.id, col.dataIndex, e.target.value)} />
    },
  }))
  tableColumns.push({
    title: 'Thao tác',
    width: 90,
    align: 'center',
    render: (_, record) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(record.id)} />,
  })

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button icon={<PlusOutlined />} onClick={() => setData([...data, newRow('tmp')])}>{addText}</Button>
      <Table rowKey="id" dataSource={data} columns={tableColumns} pagination={false} scroll={{ x: 900 }} />
    </Space>
  )
}

function Preview({ bundle }) {
  const s = bundle?.syllabus || {}
  const instructors = bundle?.instructors || []
  const objectives = bundle?.objectives || []
  const clos = bundle?.clos || []
  const teachingPlans = bundle?.teachingPlans || []
  const assessments = bundle?.assessments || []
  const references = bundle?.references || []

  return (
    <div id="syllabus-preview" style={{ background: '#fff', padding: 24, color: '#111', lineHeight: 1.45 }}>
      <Row justify="space-between" align="top">
        <Col span={10} style={{ textAlign: 'center' }}>
          <Text strong>HỌC VIỆN HÀNG KHÔNG VIỆT NAM</Text><br />
          <Text strong>KHOA QUẢN TRỊ KINH DOANH</Text>
        </Col>
        <Col span={10} style={{ textAlign: 'center' }}>
          <Text strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text><br />
          <Text strong>Độc lập – Tự do – Hạnh phúc</Text>
        </Col>
      </Row>
      <Title level={3} style={{ textAlign: 'center', marginTop: 32 }}>ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN<br />TRÌNH ĐỘ THẠC SĨ</Title>

      <Title level={4}>1. THÔNG TIN TỔNG QUÁT</Title>
      <table className="preview-table"><tbody>
        <tr><td>Tên học phần tiếng Việt</td><td><b>{s.vietnamese_title}</b></td></tr>
        <tr><td>Tên học phần tiếng Anh</td><td><b>{s.english_title}</b></td></tr>
        <tr><td>Mã học phần</td><td>{s.course_code}</td></tr>
        <tr><td>Loại học phần</td><td>{s.course_type}</td></tr>
        <tr><td>Khối kiến thức/kỹ năng</td><td>{s.knowledge_block}</td></tr>
        <tr><td>Số tín chỉ</td><td>{s.credits}</td></tr>
        <tr><td>Lý thuyết / Thực hành / Tự học</td><td>{s.theory_hours} / {s.practice_hours} / {s.self_study_hours}</td></tr>
        <tr><td>Điều kiện tiên quyết</td><td>{s.prerequisite || 'Không'}</td></tr>
      </tbody></table>

      <Title level={4}>2. THÔNG TIN GIẢNG VIÊN</Title>
      <table className="preview-table"><thead><tr><th>STT</th><th>Họ và tên</th><th>Email</th><th>Đơn vị công tác</th></tr></thead><tbody>
        {instructors.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td>{x.full_name}</td><td>{x.email}</td><td>{x.unit}</td></tr>)}
      </tbody></table>

      <Title level={4}>3. MÔ TẢ HỌC PHẦN</Title>
      <Paragraph>{s.description}</Paragraph>

      <Title level={4}>4. MỤC TIÊU HỌC PHẦN</Title>
      <table className="preview-table"><thead><tr><th>Mục tiêu</th><th>Mô tả mục tiêu</th><th>CĐR CTĐT</th><th>TĐNL</th></tr></thead><tbody>
        {objectives.map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.description}</td><td>{x.plo_codes}</td><td>{x.bloom_level}</td></tr>)}
      </tbody></table>

      <Title level={4}>5. CHUẨN ĐẦU RA HỌC PHẦN</Title>
      <table className="preview-table"><thead><tr><th>Mục tiêu</th><th>CĐR học phần</th><th>Mô tả chuẩn đầu ra</th><th>TĐNL</th></tr></thead><tbody>
        {clos.map((x) => <tr key={x.id}><td>{x.objective_code}</td><td>{x.code}</td><td>{x.description}</td><td>{x.bloom_level}</td></tr>)}
      </tbody></table>

      <Title level={4}>6. NỘI DUNG VÀ KẾ HOẠCH GIẢNG DẠY</Title>
      <table className="preview-table"><thead><tr><th>Tuần</th><th>Nội dung</th><th>CĐR</th><th>PP dạy và học</th><th>Đánh giá</th><th>Tự học</th><th>Bài tập</th></tr></thead><tbody>
        {teachingPlans.map((x) => <tr key={x.id}><td>{x.week_no}</td><td>{x.content}</td><td>{x.clo_codes}</td><td>{x.teaching_methods}</td><td>{x.assessment_methods}</td><td>{x.self_study_requirements}</td><td>{x.homework}</td></tr>)}
      </tbody></table>

      <Title level={4}>7. ĐÁNH GIÁ HỌC PHẦN</Title>
      <table className="preview-table"><thead><tr><th>Nội dung đánh giá</th><th>Thời điểm</th><th>Phương thức</th><th>Tỉ lệ</th><th>CLO</th></tr></thead><tbody>
        {assessments.map((x) => <tr key={x.id}><td>{x.component}</td><td>{x.timing}</td><td>{x.method}</td><td>{x.percentage}%</td><td>{x.clo_codes}</td></tr>)}
      </tbody></table>

      <Title level={4}>8. NGUỒN HỌC LIỆU</Title>
      {references.map((x, i) => <Paragraph key={x.id}>[{i + 1}] {x.citation}</Paragraph>)}

      <Title level={4}>9. QUY ĐỊNH CỦA HỌC PHẦN</Title>
      <Paragraph>{s.regulations}</Paragraph>

      <Title level={4}>10. PHÊ DUYỆT</Title>
      <Row justify="space-around" style={{ marginTop: 32, textAlign: 'center' }}>
        <Col><b>Trưởng khoa</b><br /><br /><br />................................</Col>
        <Col><b>Trưởng bộ môn</b><br /><br /><br />................................</Col>
        <Col><b>Giảng viên</b><br /><br /><br />................................</Col>
      </Row>
    </div>
  )
}

export default function CourseSyllabusPage() {
  const [items, setItems] = useState([])
  const [catalogs, setCatalogs] = useState({ courses: [], faculty: [], programs: [] })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [bundle, setBundle] = useState(null)
  const [form] = Form.useForm()

  const [instructors, setInstructors] = useState([])
  const [objectives, setObjectives] = useState([])
  const [clos, setClos] = useState([])
  const [mappings, setMappings] = useState([])
  const [teachingPlans, setTeachingPlans] = useState([])
  const [assessments, setAssessments] = useState([])
  const [references, setReferences] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [list, cats] = await Promise.all([listSyllabi({ search, status }), loadCatalogs()])
      setItems(list)
      setCatalogs(cats)
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: items.length,
    draft: items.filter((x) => x.status === 'draft').length,
    approved: items.filter((x) => x.status === 'approved' || x.status === 'published').length,
    credits: items.reduce((sum, x) => sum + Number(x.credits || 0), 0),
  }), [items])

  const resetDetails = () => {
    setInstructors([]); setObjectives([]); setClos([]); setMappings([]); setTeachingPlans([]); setAssessments([]); setReferences([])
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ status: 'draft', course_type: 'Bắt buộc', credits: 3 })
    resetDetails()
    setOpen(true)
  }

  const openEdit = async (id) => {
    try {
      const b = await getSyllabusBundle(id)
      setBundle(b)
      form.setFieldsValue(b.syllabus)
      setInstructors(b.instructors)
      setObjectives(b.objectives)
      setClos(b.clos)
      setMappings(b.mappings)
      setTeachingPlans(b.teachingPlans)
      setAssessments(b.assessments)
      setReferences(b.references)
      setOpen(true)
    } catch (e) { message.error(e.message) }
  }

  const openPreview = async (id) => {
    try {
      setBundle(await getSyllabusBundle(id))
      setPreviewOpen(true)
    } catch (e) { message.error(e.message) }
  }

  const onCourseChange = (courseId) => {
    const c = catalogs.courses.find((x) => x.id === courseId)
    if (!c) return
    form.setFieldsValue({
      course_id: c.id,
      vietnamese_title: c.course_name || c.name || c.title || '',
      english_title: c.course_name_en || '',
      course_code: c.course_code || c.code || '',
      credits: c.credits || c.credit || 0,
      theory_hours: c.theory_hours || 0,
      practice_hours: c.practice_hours || 0,
      self_study_hours: c.self_study_hours || 0,
      course_type: c.course_type || 'Bắt buộc',
      knowledge_block: c.knowledge_block || '',
      prerequisite: c.prerequisite || '',
    })
  }

  const addInstructorFromFaculty = (facultyId) => {
    const f = catalogs.faculty.find((x) => x.id === facultyId)
    if (!f) return
    setInstructors([...instructors, {
      ...newRow('ins'),
      faculty_id: f.id,
      full_name: f.full_name,
      email: f.email,
      unit: f.department || f.unit || 'Khoa Quản trị kinh doanh',
    }])
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const saved = await saveSyllabusBundle(values, { instructors, objectives, clos, mappings, teachingPlans, assessments, references })
      setBundle(saved)
      setOpen(false)
      message.success('Đã lưu đề cương học phần')
      load()
    } catch (e) { message.error(e.message || 'Không thể lưu') }
  }

  const columns = [
    { title: 'Mã HP', dataIndex: 'course_code', width: 120 },
    { title: 'Tên học phần', dataIndex: 'vietnamese_title', render: (v, r) => <Space direction="vertical" size={0}><b>{v}</b><Text type="secondary">{r.english_title}</Text></Space> },
    { title: 'TC', dataIndex: 'credits', width: 80, align: 'center' },
    { title: 'Loại', dataIndex: 'course_type', width: 120, render: (v) => <Tag color={v === 'Bắt buộc' ? 'blue' : 'purple'}>{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (v) => <Tag color={v === 'published' ? 'green' : v === 'approved' ? 'cyan' : v === 'submitted' ? 'orange' : 'default'}>{statusOptions.find((x) => x.value === v)?.label || v}</Tag> },
    { title: 'Cập nhật', dataIndex: 'updated_at', width: 150, render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' },
    { title: 'Thao tác', width: 180, align: 'center', render: (_, record) => (
      <Space>
        <Button icon={<EyeOutlined />} onClick={() => openPreview(record.id)} />
        <Button icon={<EditOutlined />} onClick={() => openEdit(record.id)} />
        <Popconfirm title="Xóa đề cương này?" onConfirm={async () => { await deleteSyllabus(record.id); message.success('Đã xóa'); load() }}>
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div style={{ padding: 24 }}>
      <style>{`.preview-table{width:100%;border-collapse:collapse;margin:10px 0 18px}.preview-table td,.preview-table th{border:1px solid #333;padding:6px;vertical-align:top}.preview-table th{text-align:center;font-weight:700}`}</style>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2}>Đề cương học phần</Title>
          <Text type="secondary">Quản lý đề cương chi tiết, CLO, kế hoạch giảng dạy, đánh giá và học liệu.</Text>
        </Col>
        <Col><Space><Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm đề cương</Button></Space></Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={6}><Card><Statistic title="Tổng đề cương" value={stats.total} /></Card></Col>
        <Col span={6}><Card><Statistic title="Bản nháp" value={stats.draft} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đã phê duyệt/công bố" value={stats.approved} /></Card></Col>
        <Col span={6}><Card><Statistic title="Tổng tín chỉ" value={stats.credits} /></Card></Col>
      </Row>

      <Card style={{ marginTop: 20 }}>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Tìm mã/tên học phần..." value={search} onChange={(e) => setSearch(e.target.value)} onSearch={load} style={{ width: 320 }} />
          <Select placeholder="Trạng thái" allowClear value={status || undefined} options={statusOptions} onChange={(v) => setStatus(v || '')} style={{ width: 180 }} />
          <Button type="primary" onClick={load}>Tìm kiếm</Button>
        </Space>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={items} scroll={{ x: 1000 }} />
      </Card>

      <Modal open={open} onCancel={() => setOpen(false)} title="Đề cương học phần" width="92%" footer={<Space><Button onClick={() => setOpen(false)}>Hủy</Button><Button type="primary" icon={<SaveOutlined />} onClick={save}>Lưu</Button></Space>}>
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Tabs items={[
            { key: 'info', label: '1. Thông tin chung', children: <>
              <Row gutter={16}>
                <Col span={8}><Form.Item name="course_id" label="Chọn học phần"><Select showSearch allowClear optionFilterProp="label" options={catalogs.courses.map((c) => ({ value: c.id, label: `${c.course_code || c.code || ''} - ${c.course_name || c.name || c.title || ''}` }))} onChange={onCourseChange} /></Form.Item></Col>
                <Col span={8}><Form.Item name="program_id" label="Chương trình đào tạo"><Select allowClear options={catalogs.programs.map((p) => ({ value: p.id, label: `${p.program_code || p.code || ''} - ${p.program_name || p.name || ''}` }))} /></Form.Item></Col>
                <Col span={8}><Form.Item name="status" label="Trạng thái"><Select options={statusOptions} /></Form.Item></Col>
                <Col span={12}><Form.Item name="vietnamese_title" label="Tên học phần tiếng Việt" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="english_title" label="Tên học phần tiếng Anh"><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="course_code" label="Mã học phần"><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="credits" label="Số tín chỉ"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="course_type" label="Loại học phần"><Select options={courseTypeOptions} /></Form.Item></Col>
                <Col span={6}><Form.Item name="knowledge_block" label="Khối kiến thức"><Select allowClear options={knowledgeBlockOptions} /></Form.Item></Col>
                <Col span={6}><Form.Item name="theory_hours" label="Số tiết lý thuyết"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="practice_hours" label="Số tiết TH/BT"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="self_study_hours" label="Số tiết tự học"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="approval_date" label="Ngày phê duyệt"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
                <Col span={8}><Form.Item name="prerequisite" label="Học phần tiên quyết"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="prior_course" label="Học phần học trước"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="other_conditions" label="Điều kiện khác"><Input /></Form.Item></Col>
                <Col span={24}><Form.Item name="description" label="Mô tả học phần"><TextArea rows={4} /></Form.Item></Col>
                <Col span={24}><Form.Item name="regulations" label="Quy định học phần"><TextArea rows={4} /></Form.Item></Col>
              </Row>
              <Divider>Giảng viên</Divider>
              <Space style={{ marginBottom: 8 }}><Select placeholder="Thêm giảng viên từ danh mục" showSearch optionFilterProp="label" style={{ width: 360 }} options={catalogs.faculty.map((f) => ({ value: f.id, label: `${f.full_name} - ${f.email || ''}` }))} onChange={addInstructorFromFaculty} /></Space>
              <EditableTable data={instructors} setData={setInstructors} columns={[{ title: 'Họ tên', dataIndex: 'full_name' }, { title: 'Email', dataIndex: 'email' }, { title: 'Đơn vị', dataIndex: 'unit' }, { title: 'Vai trò', dataIndex: 'role' }]} />
            </> },
            { key: 'objectives', label: '2. Mục tiêu', children: <EditableTable data={objectives} setData={setObjectives} columns={[{ title: 'Mã', dataIndex: 'code' }, { title: 'Mô tả', dataIndex: 'description', type: 'textarea' }, { title: 'PLO', dataIndex: 'plo_codes' }, { title: 'Bloom', dataIndex: 'bloom_level', type: 'select', options: bloomOptions }]} /> },
            { key: 'clos', label: '3. CLO', children: <EditableTable data={clos} setData={setClos} columns={[{ title: 'Mục tiêu', dataIndex: 'objective_code' }, { title: 'CLO', dataIndex: 'code' }, { title: 'Nhóm', dataIndex: 'category' }, { title: 'Mô tả', dataIndex: 'description', type: 'textarea' }, { title: 'Bloom', dataIndex: 'bloom_level', type: 'select', options: bloomOptions }]} /> },
            { key: 'mapping', label: '4. Mapping CLO-PLO', children: <EditableTable data={mappings} setData={setMappings} columns={[{ title: 'CLO', dataIndex: 'clo_code' }, { title: 'PLO', dataIndex: 'plo_code' }, { title: 'Mức', dataIndex: 'level', type: 'select', options: levelOptions }]} /> },
            { key: 'teaching', label: '5. Kế hoạch giảng dạy', children: <EditableTable data={teachingPlans} setData={setTeachingPlans} columns={[{ title: 'Tuần', dataIndex: 'week_no', type: 'number' }, { title: 'Nội dung', dataIndex: 'content', type: 'textarea' }, { title: 'CLO', dataIndex: 'clo_codes' }, { title: 'PP dạy-học', dataIndex: 'teaching_methods', type: 'textarea' }, { title: 'Đánh giá', dataIndex: 'assessment_methods', type: 'textarea' }, { title: 'Tự học', dataIndex: 'self_study_requirements', type: 'textarea' }, { title: 'Bài tập', dataIndex: 'homework', type: 'textarea' }]} /> },
            { key: 'assessment', label: '6. Đánh giá', children: <EditableTable data={assessments} setData={setAssessments} columns={[{ title: 'Thành phần', dataIndex: 'component' }, { title: 'Thời điểm', dataIndex: 'timing' }, { title: 'Phương thức', dataIndex: 'method' }, { title: 'Tỉ lệ %', dataIndex: 'percentage', type: 'number' }, { title: 'CLO', dataIndex: 'clo_codes' }]} /> },
            { key: 'references', label: '7. Học liệu', children: <EditableTable data={references} setData={setReferences} columns={[{ title: 'Loại', dataIndex: 'ref_type' }, { title: 'Trích dẫn', dataIndex: 'citation', type: 'textarea' }, { title: 'DOI', dataIndex: 'doi' }, { title: 'URL', dataIndex: 'url' }]} /> },
          ]} />
        </Form>
      </Modal>

      <Modal open={previewOpen} onCancel={() => setPreviewOpen(false)} title="Preview đề cương" width="90%" footer={<Space><Button icon={<FileWordOutlined />}>Xuất Word</Button><Button icon={<FilePdfOutlined />}>Xuất PDF</Button><Button onClick={() => setPreviewOpen(false)}>Đóng</Button></Space>}>
        <Preview bundle={bundle} />
      </Modal>
    </div>
  )
}
