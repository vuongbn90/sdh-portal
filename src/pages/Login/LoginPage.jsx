import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const { Title, Text } = Typography

export default function LoginPage() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const onFinish = async (values) => {
    setLoading(true)
    setErrorText('')
    const { error } = await signIn(values.email, values.password)
    setLoading(false)

    if (error) {
      setErrorText(error.message)
      return
    }

    message.success('Đăng nhập thành công')
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-logo">VAA</div>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>SDH Portal</Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          Hệ thống quản lý sau đại học
        </Text>

        {errorText && <Alert type="error" showIcon message="Không đăng nhập được" description={errorText} style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input prefix={<MailOutlined />} placeholder="admin@vaa.edu.vn" size="large" />
          </Form.Item>

          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
