import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography, message, Alert } from 'antd'
import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const defaultForm = {
  program_id: null,
  course_id: null,
  semester: 'HK1',
  academic_year: '2026-2027',
  is_required: true,
  sequence_no: 1,
  note: '',
  status: 'active',
}

const statusOptions = [
  { value: 'active', label: 'Đang áp dụng' },
  { value: 'draft', label: 'Dự thảo' },
  { value: 'inactive', label: 'Ngưng áp dụng' },
]

const semesterOptions = [
  'HK1', 'HK2', 'HK3', 'HK4', 'HK5', 'HK6', 'Luận văn/Luận án'
].map((v) => ({ value: v, label: v }))

export default function StudyPlansPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [keyword, setKeyword] = useState('')
  const [programFilter, setProgramFilter] = useState(null)
  const [semesterFilter, setSemesterFilter] = useState(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [dbError, setDbError] = useState(null)
  const [form] = Form.useForm()

  async function loadMeta() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('programs').select('id,code,name,level,major').order('name'),
      supabase.from('courses').select('id,code,name,credits,course_type').order('name'),
    ])
    setPrograms(p || [])
    setCourses(c || [])
  }

  async function loadRows() {
    setLoading(true)
    setDbError(null)
    const { data, error } = await supabase
      .from('study_plans')
      .select('id,program_id,course_id,semester,academic_year,is_required,sequence_no,note,status,programs(code,name,level),courses(code,name,credits,course_type)')
      .order('academic_year', { ascending: false })
      .order('semester')
      .order('sequence_no')

    if (error) {
      setDbError(error.message)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMeta()
    loadRows()
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      const text = [
        r.programs?.code,
        r.programs?.name,
        r.courses?.code,
        r.courses?.name,
        r.semester,
        r.academic_year,
        r.status,
      ].join(' ').toLowerCase()
      return (!q || text.includes(q)) && (!programFilter || r.program_id === programFilter) && (!semesterFilter || r.semester === semesterFilter)
    })
  }, [rows, keyword, programFilter, semesterFilter])

  const stats = useMemo(() => {
    const credits = filtered.reduce((sum, r) => sum + Number(r.courses?.credits || 0), 0)
    return {
      total: filtered.length,
      required: filtered.filter((r) => r.is_required).length,
      elective: filtered.filter((r) => !r.is_required).length,
      credits,
    }
  }, [filtered])

  function openCreate() {
    setEditing(null)
    form.setFieldsValue(defaultForm)
    setOpen(true)
  }

  function openEdit(record) {
    setEditing(record)
    form.setFieldsValue({
      program_id: record.program_id,
      course_id: record.course_id,
      semester: record.semester,
      academic_year: record.academic_year,
      is_required: record.is_required,
      sequence_no: record.sequence_no,
      note: record.note,
      status: record.status,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    const payload = {
      ...values,
      sequence_no: Number(values.sequence_no || 1),
      is_required: Boolean(values.is_required),
    }
    const result = editing
      ? await supabase.from('study_plans').update(payload).eq('id', editing.id)
      : await supabase.from('study_plans').insert(payload)

    if (result.error) {
      message.error(result.error.message)
      return
    }
    message.success(editing ? 'Đã cập nhật kế hoạch học tập' : 'Đã thêm học phần vào kế hoạch')
    setOpen(false)
    loadRows()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('study_plans').delete().eq('id', id)
    if (error) message.error(error.message)
    else {
      message.success('Đã xóa')
      loadRows()
    }
  }

  function handleExport() {
    exportCsv(
      'ke-hoach-hoc-tap.csv',
      filtered.map((r) => ({
        ChuongTrinh: `${r.programs?.code || ''} - ${r.programs?.name || ''}`,
        HocPhan: `${r.courses?.code || ''} - ${r.courses?.name || ''}`,
        TinChi: r.courses?.credits || '',
        HocKy: r.semester,
        NamHoc: r.academic_year,
        Loai: r.is_required ? 'Bắt buộc' : 'Tự chọn',
        ThuTu: r.sequence_no,
        TrangThai: r.status,
        GhiChu: r.note || '',
      }))
    )
  }

  const columns = [
    { title: 'CTĐT', dataIndex: ['programs', 'code'], render: (_, r) => <div><b>{r.programs?.code}</b><br /><Text type="secondary">{r.programs?.name}</Text></div> },
    { title: 'Học phần', dataIndex: ['courses', 'code'], render: (_, r) => <div><b>{r.courses?.code}</b><br /><Text>{r.courses?.name}</Text></div> },
    { title: 'TC', width: 70, align: 'center', render: (_, r) => r.courses?.credits || 0 },
    { title: 'Học kỳ', dataIndex: 'semester', width: 130 },
    { title: 'Năm học', dataIndex: 'academic_year', width: 120 },
    { title: 'Loại', width: 110, render: (_, r) => r.is_required ? <Tag color="blue">Bắt buộc</Tag> : <Tag color="purple">Tự chọn</Tag> },
    { title: 'Thứ tự', dataIndex: 'sequence_no', width: 90, align: 'center' },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (v) => <Tag color={v === 'active' ? 'green' : v === 'draft' ? 'orange' : 'default'}>{statusOptions.find((x) => x.value === v)?.label || v}</Tag> },
    {
      title: 'Thao tác', width: 130, fixed: 'right', render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa dòng kế hoạch này?" onConfirm={() => handleDelete(r.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const setupSql = `create table if not exists public.study_plans (\n  id uuid primary key default uuid_generate_v4(),\n  program_id uuid references public.programs(id) on delete cascade,\n  course_id uuid references public.courses(id) on delete cascade,\n  semester text not null,\n  academic_year text,\n  is_required boolean default true,\n  sequence_no int default 1,\n  note text,\n  status text default 'active',\n  created_at timestamptz default now(),\n  updated_at timestamptz default now(),\n  unique(program_id, course_id, semester, academic_year)\n);\nalter table public.study_plans enable row level security;\ndrop policy if exists dev_all on public.study_plans;\ncreate policy dev_all on public.study_plans for all using (true) with check (true);`

  return (
    <div>
      <div className="page-heading">
        <div>
          <Title level={3}>Kế hoạch học tập</Title>
          <Text type="secondary">Gán học phần vào từng học kỳ của chương trình đào tạo.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadMeta(); loadRows(); }}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Xuất CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm kế hoạch</Button>
        </Space>
      </div>

      {dbError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chưa có bảng study_plans hoặc chưa cấp quyền truy cập"
          description={<div><p>{dbError}</p><p>Vào Supabase → SQL Editor, chạy SQL trong file <b>supabase/study_plans.sql</b>, rồi bấm Tải lại.</p><pre style={{ whiteSpace: 'pre-wrap', background: '#111827', color: '#fff', padding: 12, borderRadius: 8 }}>{setupSql}</pre></div>}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card><Statistic title="Tổng dòng KHHT" value={stats.total} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Bắt buộc" value={stats.required} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Tự chọn" value={stats.elective} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Tổng tín chỉ" value={stats.credits} /></Card></Col>
      </Row>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search allowClear placeholder="Tìm CTĐT, học phần, học kỳ..." style={{ width: 320 }} onChange={(e) => setKeyword(e.target.value)} />
          <Select allowClear placeholder="Lọc chương trình" style={{ width: 320 }} value={programFilter} onChange={setProgramFilter} options={programs.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))} />
          <Select allowClear placeholder="Lọc học kỳ" style={{ width: 180 }} value={semesterFilter} onChange={setSemesterFilter} options={semesterOptions} />
        </Space>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1100 }} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title={editing ? 'Sửa kế hoạch học tập' : 'Thêm kế hoạch học tập'} open={open} onOk={handleSubmit} onCancel={() => setOpen(false)} width={760} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={defaultForm}>
          <Row gutter={16}>
            <Col span={24}><Form.Item name="program_id" label="Chương trình đào tạo" rules={[{ required: true, message: 'Chọn chương trình đào tạo' }]}><Select showSearch optionFilterProp="label" options={programs.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))} /></Form.Item></Col>
            <Col span={24}><Form.Item name="course_id" label="Học phần" rules={[{ required: true, message: 'Chọn học phần' }]}><Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name} (${c.credits || 0} TC)` }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name="semester" label="Học kỳ" rules={[{ required: true }]}><Select options={semesterOptions} /></Form.Item></Col>
            <Col span={8}><Form.Item name="academic_year" label="Năm học"><Input placeholder="2026-2027" /></Form.Item></Col>
            <Col span={8}><Form.Item name="sequence_no" label="Thứ tự"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="is_required" label="Loại học phần"><Select options={[{ value: true, label: 'Bắt buộc' }, { value: false, label: 'Tự chọn' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="status" label="Trạng thái"><Select options={statusOptions} /></Form.Item></Col>
            <Col span={24}><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
