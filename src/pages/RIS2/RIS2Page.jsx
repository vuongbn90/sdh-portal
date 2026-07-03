import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const publicationTable = 'ris_publications'
const authorTable = 'ris_publication_authors'
const projectTable = 'ris_projects'
const memberTable = 'ris_project_members'

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function RIS2Page() {
  const [faculty, setFaculty] = useState([])
  const [publications, setPublications] = useState([])
  const [authors, setAuthors] = useState([])
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pubOpen, setPubOpen] = useState(false)
  const [authorOpen, setAuthorOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [editingPub, setEditingPub] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [selectedPub, setSelectedPub] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [pubForm] = Form.useForm()
  const [authorForm] = Form.useForm()
  const [projectForm] = Form.useForm()
  const [memberForm] = Form.useForm()

  const facultyName = (id) => {
    const f = faculty.find((x) => x.id === id)
    return pick(f, ['full_name', 'name', 'ho_ten'], id || '')
  }

  const load = async () => {
    setLoading(true)

    const { data: facultyData } = await supabase.from('faculty').select('*').order('full_name', { ascending: true })
    setFaculty(facultyData || [])

    const { data: pubData, error: pubError } = await supabase.from(publicationTable).select('*').order('created_at', { ascending: false })
    if (pubError) message.error('Chưa thể đọc bảng ris_publications. Hãy chạy ris2_schema.sql và ris2_rls.sql')
    setPublications(pubData || [])

    const { data: authorData } = await supabase.from(authorTable).select('*')
    setAuthors(authorData || [])

    const { data: projectData } = await supabase.from(projectTable).select('*').order('created_at', { ascending: false })
    setProjects(projectData || [])

    const { data: memberData } = await supabase.from(memberTable).select('*')
    setMembers(memberData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredPublications = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return publications
    return publications.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [publications, keyword])

  const filteredProjects = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [projects, keyword])

  const stats = useMemo(() => {
    const q1q2 = publications.filter((x) => ['Q1', 'Q2'].includes(String(x.quartile || '').toUpperCase())).length
    const totalPoints = publications.reduce((sum, x) => sum + Number(x.points || 0), 0)
    return {
      publications: publications.length,
      projects: projects.length,
      q1q2,
      totalPoints,
    }
  }, [publications, projects])

  const openCreatePub = () => {
    setEditingPub(null)
    pubForm.setFieldsValue({ publication_type: 'Bài báo', publication_year: new Date().getFullYear(), points: 0, status: 'active' })
    setPubOpen(true)
  }

  const openEditPub = (record) => {
    setEditingPub(record)
    pubForm.setFieldsValue(record)
    setPubOpen(true)
  }

  const savePublication = async () => {
    const values = await pubForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error

    if (editingPub?.id) {
      const result = await supabase.from(publicationTable).update(payload).eq('id', editingPub.id)
      error = result.error
    } else {
      const result = await supabase.from(publicationTable).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }

    if (error) return message.error(error.message)
    message.success(editingPub ? 'Đã cập nhật công bố' : 'Đã thêm công bố')
    setPubOpen(false)
    load()
  }

  const removePublication = async (id) => {
    const { error } = await supabase.from(publicationTable).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa công bố')
    load()
  }

  const openAuthors = (record) => {
    setSelectedPub(record)
    authorForm.resetFields()
    setAuthorOpen(true)
  }

  const saveAuthor = async () => {
    const values = await authorForm.validateFields()
    const payload = {
      publication_id: selectedPub.id,
      faculty_id: values.faculty_id,
      author_name: facultyName(values.faculty_id),
      author_order: values.author_order || 1,
      role: values.role || 'Đồng tác giả',
      is_corresponding: values.is_corresponding || false,
      contribution_rate: values.contribution_rate || null,
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from(authorTable).insert([payload])
    if (error) return message.error(error.message)
    message.success('Đã thêm tác giả. LLKH của giảng viên này sẽ tự có công bố này.')
    authorForm.resetFields()
    load()
  }

  const removeAuthor = async (id) => {
    const { error } = await supabase.from(authorTable).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa tác giả')
    load()
  }

  const openCreateProject = () => {
    setEditingProject(null)
    projectForm.setFieldsValue({ start_year: new Date().getFullYear(), end_year: new Date().getFullYear(), status: 'active' })
    setProjectOpen(true)
  }

  const openEditProject = (record) => {
    setEditingProject(record)
    projectForm.setFieldsValue(record)
    setProjectOpen(true)
  }

  const saveProject = async () => {
    const values = await projectForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error

    if (editingProject?.id) {
      const result = await supabase.from(projectTable).update(payload).eq('id', editingProject.id)
      error = result.error
    } else {
      const result = await supabase.from(projectTable).insert([{ ...payload, created_at: new Date().toISOString() }])
      error = result.error
    }

    if (error) return message.error(error.message)
    message.success(editingProject ? 'Đã cập nhật đề tài' : 'Đã thêm đề tài')
    setProjectOpen(false)
    load()
  }

  const removeProject = async (id) => {
    const { error } = await supabase.from(projectTable).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa đề tài')
    load()
  }

  const openMembers = (record) => {
    setSelectedProject(record)
    memberForm.resetFields()
    setMemberOpen(true)
  }

  const saveMember = async () => {
    const values = await memberForm.validateFields()
    const payload = {
      project_id: selectedProject.id,
      faculty_id: values.faculty_id,
      member_name: facultyName(values.faculty_id),
      role: values.role || 'Thành viên',
      contribution_rate: values.contribution_rate || null,
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from(memberTable).insert([payload])
    if (error) return message.error(error.message)
    message.success('Đã thêm thành viên. LLKH của giảng viên này sẽ tự có đề tài này.')
    memberForm.resetFields()
    load()
  }

  const removeMember = async (id) => {
    const { error } = await supabase.from(memberTable).delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa thành viên')
    load()
  }

  const publicationColumns = [
    { title: 'Mã', dataIndex: 'publication_code', width: 120 },
    { title: 'Tên công trình', dataIndex: 'title', render: (v) => <b>{v}</b> },
    { title: 'Loại', dataIndex: 'publication_type', render: (v) => <Tag color="blue">{v || 'Bài báo'}</Tag> },
    { title: 'Tạp chí/NXB', dataIndex: 'journal' },
    { title: 'Năm', dataIndex: 'publication_year', align: 'center' },
    { title: 'Q', dataIndex: 'quartile', render: (v) => v ? <Tag color={['Q1','Q2'].includes(String(v).toUpperCase()) ? 'green' : 'default'}>{v}</Tag> : '—' },
    { title: 'Điểm', dataIndex: 'points', align: 'center' },
    { title: 'Tác giả', render: (_, r) => authors.filter((a) => a.publication_id === r.id).map((a) => a.author_name || facultyName(a.faculty_id)).join(', ') || 'Chưa gán' },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<UserAddOutlined />} onClick={() => openAuthors(r)}>Tác giả</Button><Button icon={<EditOutlined />} onClick={() => openEditPub(r)}>Sửa</Button><Popconfirm title="Xóa công bố?" onConfirm={() => removePublication(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const authorColumns = [
    { title: 'Thứ tự', dataIndex: 'author_order', width: 80 },
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id, r) => r.author_name || facultyName(id) },
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Corresponding', dataIndex: 'is_corresponding', render: (v) => v ? <Tag color="green">Có</Tag> : 'Không' },
    { title: 'Đóng góp %', dataIndex: 'contribution_rate' },
    { title: 'Thao tác', render: (_, r) => <Popconfirm title="Xóa tác giả?" onConfirm={() => removeAuthor(r.id)}><Button danger size="small">Xóa</Button></Popconfirm> },
  ]

  const projectColumns = [
    { title: 'Mã', dataIndex: 'project_code', width: 120 },
    { title: 'Tên đề tài', dataIndex: 'project_title', render: (v) => <b>{v}</b> },
    { title: 'Cấp', dataIndex: 'project_level' },
    { title: 'Cơ quan tài trợ', dataIndex: 'funding_agency' },
    { title: 'Từ năm', dataIndex: 'start_year' },
    { title: 'Đến năm', dataIndex: 'end_year' },
    { title: 'Thành viên', render: (_, r) => members.filter((m) => m.project_id === r.id).map((m) => m.member_name || facultyName(m.faculty_id)).join(', ') || 'Chưa gán' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'completed' ? 'green' : 'blue'}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<UserAddOutlined />} onClick={() => openMembers(r)}>Thành viên</Button><Button icon={<EditOutlined />} onClick={() => openEditProject(r)}>Sửa</Button><Popconfirm title="Xóa đề tài?" onConfirm={() => removeProject(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const memberColumns = [
    { title: 'Giảng viên', dataIndex: 'faculty_id', render: (id, r) => r.member_name || facultyName(id) },
    { title: 'Vai trò', dataIndex: 'role' },
    { title: 'Đóng góp %', dataIndex: 'contribution_rate' },
    { title: 'Thao tác', render: (_, r) => <Popconfirm title="Xóa thành viên?" onConfirm={() => removeMember(r.id)}><Button danger size="small">Xóa</Button></Popconfirm> },
  ]

  const selectedAuthors = authors.filter((a) => a.publication_id === selectedPub?.id)
  const selectedMembers = members.filter((m) => m.project_id === selectedProject?.id)

  return <>
    <h1 className="page-title">RIS 2.0 - Hồ sơ khoa học nâng cao</h1>
    <div className="page-subtitle">Nhập một lần, tự động cập nhật LLKH cho tất cả tác giả/thành viên từ module Giảng viên.</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Công bố</div><h2>{stats.publications}</h2></Card>
      <Card className="stat-card"><div className="muted">Đề tài</div><h2>{stats.projects}</h2></Card>
      <Card className="stat-card"><div className="muted">Q1/Q2</div><h2>{stats.q1q2}</h2></Card>
      <Card className="stat-card"><div className="muted">Tổng điểm</div><h2>{stats.totalPoints}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm công bố, đề tài, tạp chí, tác giả..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 460 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('ris2-publications.csv', filteredPublications)}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreatePub}>Thêm công bố</Button>
          <Button icon={<PlusOutlined />} onClick={openCreateProject}>Thêm đề tài</Button>
        </Space>
      </div>
    </Card>

    <Tabs items={[
      { key: 'publications', label: 'Công bố khoa học', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={publicationColumns} dataSource={filteredPublications} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} /></Card> },
      { key: 'projects', label: 'Đề tài nghiên cứu', children: <Card className="table-card"><Table rowKey="id" loading={loading} columns={projectColumns} dataSource={filteredProjects} scroll={{ x: 1500 }} pagination={{ pageSize: 8 }} /></Card> },
    ]} />

    <Modal title={editingPub ? 'Cập nhật công bố' : 'Thêm công bố'} open={pubOpen} onCancel={() => setPubOpen(false)} onOk={savePublication} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={pubForm} layout="vertical"><div className="form-grid">
        <Form.Item name="publication_code" label="Mã công bố"><Input placeholder="PUB-2026-001" /></Form.Item>
        <Form.Item name="publication_type" label="Loại"><Select options={[{ value: 'Bài báo' }, { value: 'Sách' }, { value: 'Chương sách' }, { value: 'Hội thảo' }, { value: 'Khác' }]} /></Form.Item>
        <Form.Item name="title" label="Tên công trình" className="full" rules={[{ required: true, message: 'Nhập tên công trình' }]}><Input /></Form.Item>
        <Form.Item name="journal" label="Tạp chí/NXB" className="full"><Input /></Form.Item>
        <Form.Item name="publication_year" label="Năm"><InputNumber min={1990} max={2100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="quartile" label="Quartile"><Select allowClear options={[{ value: 'Q1' }, { value: 'Q2' }, { value: 'Q3' }, { value: 'Q4' }, { value: 'WoS' }, { value: 'Scopus' }, { value: 'Khác' }]} /></Form.Item>
        <Form.Item name="points" label="Điểm"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="doi" label="DOI"><Input /></Form.Item>
        <Form.Item name="url" label="Link minh chứng" className="full"><Input /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={`Tác giả: ${selectedPub?.title || ''}`} open={authorOpen} onCancel={() => setAuthorOpen(false)} footer={null} width={920}>
      <Form form={authorForm} layout="vertical" onFinish={saveAuthor}><div className="form-grid">
        <Form.Item name="faculty_id" label="Chọn giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]}><Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
        <Form.Item name="author_order" label="Thứ tự"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="role" label="Vai trò"><Select options={[{ value: 'Tác giả chính' }, { value: 'Đồng tác giả' }, { value: 'Tác giả liên hệ' }]} /></Form.Item>
        <Form.Item name="is_corresponding" label="Tác giả liên hệ"><Select options={[{ value: true, label: 'Có' }, { value: false, label: 'Không' }]} /></Form.Item>
        <Form.Item name="contribution_rate" label="Đóng góp %"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label=" "><Button type="primary" htmlType="submit">Thêm tác giả</Button></Form.Item>
      </div></Form>
      <Table rowKey="id" columns={authorColumns} dataSource={selectedAuthors} pagination={false} />
    </Modal>

    <Modal title={editingProject ? 'Cập nhật đề tài' : 'Thêm đề tài'} open={projectOpen} onCancel={() => setProjectOpen(false)} onOk={saveProject} okText="Lưu" cancelText="Hủy" width={860}>
      <Form form={projectForm} layout="vertical"><div className="form-grid">
        <Form.Item name="project_code" label="Mã đề tài"><Input placeholder="DT-2026-001" /></Form.Item>
        <Form.Item name="project_level" label="Cấp đề tài"><Select allowClear options={[{ value: 'Cấp cơ sở' }, { value: 'Cấp Bộ' }, { value: 'Cấp Nhà nước' }, { value: 'Quốc tế' }, { value: 'Khác' }]} /></Form.Item>
        <Form.Item name="project_title" label="Tên đề tài" className="full" rules={[{ required: true, message: 'Nhập tên đề tài' }]}><Input /></Form.Item>
        <Form.Item name="funding_agency" label="Cơ quan tài trợ"><Input /></Form.Item>
        <Form.Item name="budget" label="Kinh phí"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="start_year" label="Từ năm"><InputNumber min={1990} max={2100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="end_year" label="Đến năm"><InputNumber min={1990} max={2100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang thực hiện' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'cancelled', label: 'Hủy' }]} /></Form.Item>
        <Form.Item name="note" label="Ghi chú" className="full"><Input.TextArea rows={3} /></Form.Item>
      </div></Form>
    </Modal>

    <Modal title={`Thành viên đề tài: ${selectedProject?.project_title || ''}`} open={memberOpen} onCancel={() => setMemberOpen(false)} footer={null} width={900}>
      <Form form={memberForm} layout="vertical" onFinish={saveMember}><div className="form-grid">
        <Form.Item name="faculty_id" label="Chọn giảng viên" rules={[{ required: true, message: 'Chọn giảng viên' }]}><Select showSearch optionFilterProp="label" options={faculty.map((f) => ({ value: f.id, label: facultyName(f.id) }))} /></Form.Item>
        <Form.Item name="role" label="Vai trò"><Select options={[{ value: 'Chủ nhiệm' }, { value: 'Thành viên' }, { value: 'Thư ký' }, { value: 'Cố vấn' }]} /></Form.Item>
        <Form.Item name="contribution_rate" label="Đóng góp %"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label=" "><Button type="primary" htmlType="submit">Thêm thành viên</Button></Form.Item>
      </div></Form>
      <Table rowKey="id" columns={memberColumns} dataSource={selectedMembers} pagination={false} />
    </Modal>
  </>
}
