import {
  BookOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Table,
  Tag,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../services/supabase'

const scoreOptions = [
  'Tạp chí trong danh mục HĐGS 2025',
  'SCI/SCIE/SSCI IF ≥ 3 hoặc A&HCI',
  'SCI/SCIE/SSCI IF < 3 hoặc Scopus Q1',
  'ESCI hoặc Scopus Q2,Q3,Q4',
  'ACI',
  'Tạp chí quốc tế khác có ISSN/phản biện',
  'Tạp chí khoa học trong nước khác',
  'Báo cáo khoa học hội thảo quốc tế',
  'Báo cáo khoa học hội thảo quốc gia',
  'Sách/Chương sách khoa học',
  'Khác - cần Hội đồng rà soát',
].map((value) => ({ value, label: value }))

const qOptions = ['Q1', 'Q2', 'Q3', 'Q4', 'IF ≥ 3', 'IF < 3', 'Không áp dụng'].map((value) => ({ value, label: value }))

export default function FacultyPortalPage() {
  const { profile, facultyId, signOut } = useAuth()
  const [faculty, setFaculty] = useState(null)
  const [risProfile, setRisProfile] = useState(null)
  const [publications, setPublications] = useState([])
  const [supervisions, setSupervisions] = useState([])
  const [teaching, setTeaching] = useState([])
  const [loading, setLoading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [risOpen, setRisOpen] = useState(false)
  const [publicationOpen, setPublicationOpen] = useState(false)
  const [editingPub, setEditingPub] = useState(null)
  const [profileForm] = Form.useForm()
  const [risForm] = Form.useForm()
  const [pubForm] = Form.useForm()

  const load = async () => {
    if (!facultyId) return
    setLoading(true)

    const { data: f } = await supabase.from('faculty').select('*').eq('id', facultyId).maybeSingle()
    setFaculty(f || null)

    const { data: rp } = await supabase.from('ris21_faculty_profiles').select('*').eq('faculty_id', facultyId).maybeSingle()
    setRisProfile(rp || null)

    const { data: pa } = await supabase.from('ris21_publication_authors').select('publication_id, role').eq('faculty_id', facultyId)
    const ids = (pa || []).map((x) => x.publication_id).filter(Boolean)
    if (ids.length) {
      const { data: pubs } = await supabase.from('ris21_publications').select('*').in('id', ids).order('publication_year', { ascending: false })
      setPublications(pubs || [])
    } else {
      setPublications([])
    }

    const { data: sv } = await supabase.from('supervisor_assignments').select('*').or(`faculty_id.eq.${facultyId},supervisor_id.eq.${facultyId}`)
    setSupervisions(sv || [])

    const { data: teach } = await supabase
      .from('study_plan_classes')
      .select('*, study_plans(*, courses(*), programs(*))')
      .eq('teacher_id', facultyId)
    setTeaching(teach || [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [facultyId])

  const stats = useMemo(() => {
    const q1q2 = publications.filter((x) => ['Q1', 'Q2'].includes(String(x.q_if_citescore || x.quartile || '').toUpperCase())).length
    const points = publications.reduce((sum, x) => sum + Number(x.proposed_score || x.points || 0), 0)
    return {
      pubs: publications.length,
      q1q2,
      supervisions: supervisions.length,
      teaching: teaching.length,
      points,
    }
  }, [publications, supervisions, teaching])

  const openProfile = () => {
    profileForm.setFieldsValue({
      email: faculty?.email,
      phone: faculty?.phone,
      degree: faculty?.degree,
      academic_rank: faculty?.academic_rank,
      specialization: faculty?.specialization,
      department: faculty?.department,
    })
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    const { error } = await supabase.from('faculty').update(values).eq('id', facultyId)
    if (error) return message.error(error.message)
    message.success('Đã cập nhật thông tin giảng viên')
    setProfileOpen(false)
    load()
  }

  const openRis = () => {
    risForm.setFieldsValue({
      orcid: risProfile?.orcid,
      scopus_id: risProfile?.scopus_id,
      google_scholar: risProfile?.google_scholar,
      wos_researcher_id: risProfile?.wos_researcher_id,
      research_interests: risProfile?.research_interests,
      research_area: risProfile?.research_area,
      biography: risProfile?.biography,
      website: risProfile?.website,
    })
    setRisOpen(true)
  }

  const saveRis = async () => {
    const values = await risForm.validateFields()
    const payload = { ...values, faculty_id: facultyId, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('ris21_faculty_profiles').upsert(payload, { onConflict: 'faculty_id' })
    if (error) return message.error(error.message)
    message.success('Đã cập nhật LLKH/RIS')
    setRisOpen(false)
    load()
  }

  const openPublication = (record = null) => {
    setEditingPub(record)
    pubForm.setFieldsValue({
      publication_year: record?.publication_year || record?.year || new Date().getFullYear(),
      title: record?.title,
      journal: record?.journal,
      publisher: record?.publisher,
      issn_isbn: record?.issn_isbn,
      doi: record?.doi || record?.doi_link,
      score_type: record?.score_type,
      q_if_citescore: record?.q_if_citescore || record?.quartile,
      proposed_score: record?.proposed_score || record?.points || 0,
      max_score: record?.max_score || record?.points || 0,
      author_names: record?.author_names || faculty?.full_name,
      publication_date: record?.publication_date ? dayjs(record.publication_date) : null,
    })
    setPublicationOpen(true)
  }

  const savePublication = async () => {
    const values = await pubForm.validateFields()
    const payload = {
      ...values,
      publication_date: values.publication_date ? values.publication_date.format('YYYY-MM-DD') : null,
      updated_at: new Date().toISOString(),
    }

    let publicationId = editingPub?.id
    if (publicationId) {
      const { error } = await supabase.from('ris21_publications').update(payload).eq('id', publicationId)
      if (error) return message.error(error.message)
    } else {
      const { data, error } = await supabase.from('ris21_publications').insert(payload).select('id').single()
      if (error) return message.error(error.message)
      publicationId = data.id
      const { error: authorError } = await supabase.from('ris21_publication_authors').upsert(
        {
          publication_id: publicationId,
          faculty_id: facultyId,
          role: 'Tác giả',
          author_order: 1,
        },
        { onConflict: 'publication_id,faculty_id' },
      )
      if (authorError) return message.warning(`Đã lưu công bố nhưng lỗi gắn tác giả: ${authorError.message}`)
    }

    message.success('Đã lưu công bố khoa học')
    setPublicationOpen(false)
    setEditingPub(null)
    load()
  }

  const deletePublication = async (record) => {
    Modal.confirm({
      title: 'Xóa công bố?',
      content: record.title,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        await supabase.from('ris21_publication_authors').delete().eq('publication_id', record.id).eq('faculty_id', facultyId)
        const { error } = await supabase.from('ris21_publications').delete().eq('id', record.id)
        if (error) return message.error(error.message)
        message.success('Đã xóa')
        load()
      },
    })
  }

  if (!facultyId) {
    return <div style={{ padding: 32 }}><Empty description="Tài khoản chưa được liên kết với giảng viên. Vui lòng liên hệ quản trị viên." /></div>
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Cổng thông tin giảng viên</h1>
          <div>Xin chào, <b>{profile?.full_name || faculty?.full_name}</b></div>
        </div>
        <Button onClick={signOut}>Đăng xuất</Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card><Space><UserOutlined /><div><div>Mã GV</div><h2>{faculty?.faculty_code || '-'}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><FileTextOutlined /><div><div>Công bố</div><h2>{stats.pubs}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><BookOutlined /><div><div>Q1/Q2</div><h2>{stats.q1q2}</h2></div></Space></Card></Col>
        <Col xs={24} md={6}><Card><Space><TeamOutlined /><div><div>Hướng dẫn</div><h2>{stats.supervisions}</h2></div></Space></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'profile',
            label: 'Thông tin giảng viên',
            children: (
              <Card
                loading={loading}
                extra={<Button type="primary" icon={<EditOutlined />} onClick={openProfile}>Cập nhật thông tin</Button>}
              >
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Mã GV">{faculty?.faculty_code}</Descriptions.Item>
                  <Descriptions.Item label="Họ tên">{faculty?.full_name}</Descriptions.Item>
                  <Descriptions.Item label="Học hàm">{faculty?.academic_rank}</Descriptions.Item>
                  <Descriptions.Item label="Học vị">{faculty?.degree}</Descriptions.Item>
                  <Descriptions.Item label="Email">{faculty?.email}</Descriptions.Item>
                  <Descriptions.Item label="Điện thoại">{faculty?.phone}</Descriptions.Item>
                  <Descriptions.Item label="Chuyên môn">{faculty?.specialization || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Đơn vị">{faculty?.department || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'ris',
            label: 'LLKH / RIS',
            children: (
              <Card
                loading={loading}
                extra={<Button type="primary" icon={<SaveOutlined />} onClick={openRis}>Cập nhật LLKH/RIS</Button>}
              >
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="ORCID">{risProfile?.orcid || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Scopus ID">{risProfile?.scopus_id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Google Scholar">{risProfile?.google_scholar || '-'}</Descriptions.Item>
                  <Descriptions.Item label="WoS Researcher ID">{risProfile?.wos_researcher_id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Hướng nghiên cứu" span={2}>{risProfile?.research_interests || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Tiểu sử khoa học" span={2}>{risProfile?.biography || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'publications',
            label: 'Công bố khoa học',
            children: (
              <Card
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openPublication()}>Thêm công bố</Button>}
              >
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={publications}
                  scroll={{ x: 1100 }}
                  columns={[
                    { title: 'Năm', dataIndex: 'publication_year', width: 90, render: (_, r) => r.publication_year || r.year },
                    { title: 'Tên công bố', dataIndex: 'title', width: 320 },
                    { title: 'Tạp chí/NXB', dataIndex: 'journal', width: 220 },
                    { title: 'Loại tính điểm', dataIndex: 'score_type', width: 240 },
                    { title: 'Q/IF', width: 120, render: (_, r) => r.q_if_citescore || r.quartile },
                    { title: 'DOI/Link', width: 180, render: (_, r) => r.doi || r.doi_link },
                    { title: 'Điểm', width: 100, render: (_, r) => r.proposed_score || r.points || 0 },
                    {
                      title: 'Thao tác', width: 150, fixed: 'right', render: (_, r) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openPublication(r)}>Sửa</Button>
                          <Button size="small" danger onClick={() => deletePublication(r)}>Xóa</Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'supervision',
            label: 'Hướng dẫn',
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={supervisions}
                columns={[
                  { title: 'Học viên/NCS', dataIndex: 'student_name' },
                  { title: 'Vai trò', dataIndex: 'role' },
                  { title: 'Ngày phân công', dataIndex: 'assigned_date' },
                  { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color="green">{v || 'active'}</Tag> },
                ]}
              />
            ),
          },
          {
            key: 'teaching',
            label: 'Giảng dạy / CTĐT',
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={teaching}
                columns={[
                  { title: 'Mã lớp', dataIndex: 'class_code' },
                  { title: 'Học phần', render: (_, r) => r.study_plans?.courses?.course_name || r.study_plans?.courses?.name || '-' },
                  { title: 'CTĐT', render: (_, r) => r.study_plans?.programs?.program_code || r.study_plans?.programs?.code || '-' },
                  { title: 'Sĩ số', render: (_, r) => `${r.current_students || 0}/${r.max_students || 0}` },
                  { title: 'Bắt đầu', dataIndex: 'start_date' },
                  { title: 'Kết thúc', dataIndex: 'end_date' },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal title="Cập nhật thông tin giảng viên" open={profileOpen} onOk={saveProfile} onCancel={() => setProfileOpen(false)} width={760} okText="Lưu">
        <Form form={profileForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Điện thoại"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="academic_rank" label="Học hàm"><Input placeholder="PGS, GS..." /></Form.Item></Col>
            <Col span={12}><Form.Item name="degree" label="Học vị"><Input placeholder="Tiến sĩ, Thạc sĩ..." /></Form.Item></Col>
            <Col span={12}><Form.Item name="department" label="Đơn vị"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="specialization" label="Chuyên môn"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="Cập nhật LLKH/RIS" open={risOpen} onOk={saveRis} onCancel={() => setRisOpen(false)} width={820} okText="Lưu">
        <Form form={risForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="orcid" label="ORCID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="scopus_id" label="Scopus ID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="google_scholar" label="Google Scholar"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="wos_researcher_id" label="WoS Researcher ID"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="website" label="Website cá nhân"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="research_area" label="Lĩnh vực nghiên cứu"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="research_interests" label="Hướng nghiên cứu"><Input.TextArea rows={3} /></Form.Item></Col>
            <Col span={24}><Form.Item name="biography" label="Tiểu sử khoa học"><Input.TextArea rows={4} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={editingPub ? 'Sửa công bố khoa học' : 'Thêm công bố khoa học'} open={publicationOpen} onOk={savePublication} onCancel={() => setPublicationOpen(false)} width={900} okText="Lưu">
        <Form form={pubForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="publication_year" label="Năm" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={16}><Form.Item name="author_names" label="Tác giả"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item name="title" label="Tên công trình" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="journal" label="Tên tạp chí/NXB/Hội thảo"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="publisher" label="NXB"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="score_type" label="Loại tính điểm"><Select allowClear options={scoreOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="q_if_citescore" label="Q/IF/CiteScore"><Select allowClear options={qOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="issn_isbn" label="ISSN/ISBN"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="doi" label="DOI/Link"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="max_score" label="Điểm tối đa"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="proposed_score" label="Điểm đề xuất"><InputNumber min={0} step={0.25} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="publication_date" label="Ngày xuất bản"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
