import { DownloadOutlined, ReloadOutlined, SearchOutlined, BarChartOutlined } from '@ant-design/icons'
import { Button, Card, Input, Space, Table, Tag, Statistic, Row, Col, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

const modules = [
  { key: 'students', label: 'Học viên cao học' },
  { key: 'phd_students', label: 'Nghiên cứu sinh' },
  { key: 'faculty', label: 'Giảng viên' },
  { key: 'programs', label: 'Chương trình đào tạo' },
  { key: 'courses', label: 'Học phần' },
  { key: 'enrollments', label: 'Đăng ký học phần' },
  { key: 'grades', label: 'Điểm' },
  { key: 'theses', label: 'Luận văn / Luận án' },
  { key: 'councils', label: 'Hội đồng' },
  { key: 'tuition', label: 'Học phí' },
  { key: 'forms', label: 'Biểu mẫu' },
]

export default function ReportsPage() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({})
  const [tuitionRows, setTuitionRows] = useState([])
  const [gradeRows, setGradeRows] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const result = {}
      for (const m of modules) {
        const { count, error } = await supabase.from(m.key).select('*', { count: 'exact', head: true })
        result[m.key] = error ? 0 : (count || 0)
      }
      setCounts(result)
      const { data: tuition } = await supabase.from('tuition').select('*')
      setTuitionRows(tuition || [])
      const { data: grades } = await supabase.from('grades').select('*')
      setGradeRows(grades || [])
    } catch (e) {
      message.error(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const rows = useMemo(() => modules.map((m) => ({
    module: m.label,
    table: m.key,
    total: counts[m.key] || 0,
    status: (counts[m.key] || 0) > 0 ? 'Có dữ liệu' : 'Chưa có dữ liệu',
  })).filter((r) => JSON.stringify(r).toLowerCase().includes(keyword.toLowerCase())), [counts, keyword])

  const tuitionTotal = tuitionRows.reduce((s, r) => s + Number(r.amount_due || 0), 0)
  const tuitionPaid = tuitionRows.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  const avgScore = gradeRows.length ? (gradeRows.reduce((s, r) => s + Number(r.total_score || r.final_score || 0), 0) / gradeRows.length).toFixed(2) : 0

  const columns = [
    { title: 'Phân hệ', dataIndex: 'module' },
    { title: 'Bảng dữ liệu', dataIndex: 'table' },
    { title: 'Số bản ghi', dataIndex: 'total', align: 'center', render: (v) => <b>{v}</b> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'Có dữ liệu' ? 'green' : 'default'}>{v}</Tag> },
  ]

  return <>
    <h1 className="page-title">Báo cáo & Thống kê</h1>
    <div className="page-subtitle">Tổng hợp số liệu từ các phân hệ đào tạo sau đại học</div>

    <Row gutter={[16,16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={6}><Card><Statistic title="Học viên" value={counts.students || 0} prefix={<BarChartOutlined />} /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Nghiên cứu sinh" value={counts.phd_students || 0} /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Giảng viên" value={counts.faculty || 0} /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Luận văn/Luận án" value={counts.theses || 0} /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Tổng học phí phải thu" value={tuitionTotal} suffix="đ" /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Đã thu" value={tuitionPaid} suffix="đ" /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Còn nợ" value={tuitionTotal - tuitionPaid} suffix="đ" /></Card></Col>
      <Col xs={24} md={6}><Card><Statistic title="Điểm TB" value={avgScore} /></Card></Col>
    </Row>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm phân hệ..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv('bao-cao-thong-ke.csv', rows)}>Xuất CSV</Button>
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Table rowKey="table" loading={loading} columns={columns} dataSource={rows} pagination={false} />
    </Card>
  </>
}
