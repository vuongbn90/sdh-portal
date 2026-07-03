import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { supabase } from '../services/supabase'

const { Title, Text } = Typography

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFinish = async (values) => {
    setError('')
    setLoading(true)
    try {
      // Demo login for Sprint 1. Sprint sau sẽ chuyển sang Supabase Auth thật.
      if (values.email !== 'admin@vaa.edu.vn' || values.password !== '123456') {
        setError('Email hoặc mật khẩu không đúng. Dùng admin@vaa.edu.vn / 123456')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,avatar_url')
        .eq('email', values.email)
        .maybeSingle()

      onLogin({
        email: values.email,
        full_name: data?.full_name || 'Bùi Nhất Vương',
        role: 'Quản trị hệ thống',
        avatar_url: data?.avatar_url,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card" bordered={false}>
        <div className="login-brand">
          <div className="logo-circle">VAA</div>
          <div>
            <Title level={3} style={{ margin: 0 }}>SDH Portal</Title>
            <Text type="secondary">Hệ thống quản lý sau đại học</Text>
          </div>
        </div>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={handleFinish} initialValues={{ email: 'admin@vaa.edu.vn', password: '123456' }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}>
            <Input size="large" prefix={<MailOutlined />} placeholder="admin@vaa.edu.vn" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="123456" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
