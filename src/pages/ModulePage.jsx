import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const { Title, Text } = Typography

function makeColumns(rows) {
  const first = rows?.[0]
  if (!first) return []
  return Object.keys(first).slice(0, 6).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    ellipsis: true,
    render: (value) => String(value ?? ''),
  }))
}

export default function ModulePage({ title, tableName }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*').limit(50)
    if (error) {
      message.warning(`Chưa thể đọc bảng ${tableName}. Có thể do RLS hoặc bảng chưa có dữ liệu.`)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [tableName])

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return rows
    const q = keyword.toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q))
  }, [rows, keyword])

  return (
    <div>
      <Title level={2}>{title}</Title>
      <Text type="secondary">Dữ liệu đọc trực tiếp từ bảng <b>{tableName}</b> trên Supabase.</Text>
      <Card style={{ marginTop: 20 }} bordered={false}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm nhanh..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 320 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>Tải lại</Button>
          <Button type="primary">+ Thêm mới</Button>
        </Space>
        <Table
          rowKey={(record) => record.id || JSON.stringify(record)}
          loading={loading}
          dataSource={filteredRows}
          columns={makeColumns(filteredRows)}
          scroll={{ x: true }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
