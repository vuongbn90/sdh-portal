import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { supabase } from '../services/supabase'

const { Title, Text } = Typography
const normalizeRole = (role) => String(role || 'student').trim().toLowerCase()

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFinish = async (values) => {
    setError('')
    setLoading(true)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (loginError) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại tài khoản Supabase Authentication.')
        return
      }

      const authUser = data?.user
      let profile = null

      if (authUser?.id) {
        // Tìm profile bằng auth_user_id trước
        const { data: byAuth } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        profile = byAuth || null

        // Nếu profile chưa gắn auth_user_id thì tìm bằng email và gắn lại
        if (!profile && authUser.email) {
          const { data: byEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', authUser.email)
            .maybeSingle()

          if (byEmail?.id) {
            const { data: updated } = await supabase
              .from('profiles')
              .update({ auth_user_id: authUser.id, role: normalizeRole(byEmail.role) })
              .eq('id', byEmail.id)
              .select('*')
              .single()
            profile = updated || { ...byEmail, auth_user_id: authUser.id, role: normalizeRole(byEmail.role) }
          }
        }
      }

      // Giữ tương thích với App.jsx hiện tại nếu App vẫn dùng state user riêng
      onLogin?.({
        email: authUser?.email || values.email,
        full_name: profile?.full_name || authUser?.email || values.email,
        role: normalizeRole(profile?.role),
        avatar_url: profile?.avatar_url,
        student_id: profile?.student_id,
        faculty_id: profile?.faculty_id,
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

        <Form layout="vertical" onFinish={handleFinish} initialValues={{ email: '', password: '' }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}>
            <Input size="large" prefix={<MailOutlined />} placeholder="Nhập email" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
