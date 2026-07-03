import {
  AuditOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Card, Col, List, Row, Skeleton, Statistic, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const { Title, Text } = Typography

const countCards = [
  { title: 'Học viên cao học', table: 'students', icon: <UserOutlined /> },
  { title: 'Nghiên cứu sinh', table: 'phd_students', icon: <ReadOutlined /> },
  { title: 'Giảng viên', table: 'faculty', icon: <TeamOutlined /> },
  { title: 'Đề tài', table: 'research_topics', icon: <BookOutlined /> },
  { title: 'Luận văn / Luận án', table: 'theses', icon: <FileTextOutlined /> },
  { title: 'Hội đồng', table: 'councils', icon: <AuditOutlined /> },
]

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) return 0
  return count || 0
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({})
  const [news, setNews] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      const pairs = await Promise.all(countCards.map(async (card) => [card.table, await countTable(card.table)]))
      setCounts(Object.fromEntries(pairs))

      const { data: newsData } = await supabase.from('news').select('title,created_at,category').limit(5)
      const { data: taskData } = await supabase.from('tasks').select('title,description,status,due_date').limit(5)
      setNews(newsData || [])
      setTasks(taskData || [])
      setLoading(false)
    }
    loadDashboard()
  }, [])

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Text type="secondary">Tổng quan hệ thống quản lý sau đại học</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {countCards.map((card) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={card.table}>
            <Card className="stat-card" bordered={false}>
              <Statistic
                title={card.title}
                value={loading ? 0 : counts[card.table]}
                prefix={<span className="stat-icon">{card.icon}</span>}
              />
              <Tag color="green" style={{ marginTop: 12 }}>Đang hoạt động</Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Thông báo mới nhất" bordered={false} className="panel-card">
            {loading ? <Skeleton /> : (
              <List
                dataSource={news}
                locale={{ emptyText: 'Chưa có thông báo' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={<span>{item.category || 'Thông báo'} · {item.created_at?.slice(0, 10)}</span>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Việc cần xử lý" bordered={false} className="panel-card">
            {loading ? <Skeleton /> : (
              <List
                dataSource={tasks}
                locale={{ emptyText: 'Không có việc cần xử lý' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CalendarOutlined />}
                      title={item.title}
                      description={item.description || item.status}
                    />
                    <Tag color="blue">{item.status}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
