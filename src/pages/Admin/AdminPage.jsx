import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { exportCsv } from '../../utils/exportCsv'

function pick(row, keys, fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key]
  return fallback
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState([])
  const [roles, setRoles] = useState([])
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('profiles')

  const [profileOpen, setProfileOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [settingOpen, setSettingOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [editingRole, setEditingRole] = useState(null)
  const [editingSetting, setEditingSetting] = useState(null)

  const [profileForm] = Form.useForm()
  const [roleForm] = Form.useForm()
  const [settingForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const { data: profileData, error: pError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (pError) message.error(pError.message)
    setProfiles(profileData || [])

    const { data: roleData, error: rError } = await supabase.from('roles').select('*').order('code', { ascending: true })
    if (rError) message.error(rError.message)
    setRoles(roleData || [])

    const { data: logData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
    setLogs(logData || [])

    const { data: settingData } = await supabase.from('system_settings').select('*').order('key', { ascending: true })
    setSettings(settingData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filterRows = (rows) => {
    const q = keyword.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }

  const stats = useMemo(() => {
    const activeUsers = profiles.filter((x) => pick(x, ['status'], 'active') === 'active').length
    const adminUsers = profiles.filter((x) => String(pick(x, ['role'], '')).toUpperCase().includes('ADMIN')).length
    return {
      users: profiles.length,
      activeUsers,
      roles: roles.length,
      logs: logs.length,
      adminUsers,
    }
  }, [profiles, roles, logs])

  const openCreateProfile = () => {
    setEditingProfile(null)
    profileForm.setFieldsValue({ email: '', full_name: '', phone: '', role: 'ADMIN', unit: '', status: 'active' })
    setProfileOpen(true)
  }

  const openEditProfile = (record) => {
    setEditingProfile(record)
    profileForm.setFieldsValue({
      email: pick(record, ['email']),
      full_name: pick(record, ['full_name', 'name']),
      phone: pick(record, ['phone']),
      role: pick(record, ['role'], 'ADMIN'),
      unit: pick(record, ['unit']),
      status: pick(record, ['status'], 'active'),
    })
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error
    if (editingProfile?.id) {
      ;({ error } = await supabase.from('profiles').update(payload).eq('id', editingProfile.id))
    } else {
      ;({ error } = await supabase.from('profiles').insert([{ ...payload, created_at: new Date().toISOString() }]))
    }
    if (error) return message.error(error.message)
    message.success(editingProfile ? 'Đã cập nhật người dùng' : 'Đã thêm người dùng')
    setProfileOpen(false)
    load()
  }

  const removeProfile = async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa người dùng')
    load()
  }

  const openCreateRole = () => {
    setEditingRole(null)
    roleForm.setFieldsValue({ code: '', name: '', description: '' })
    setRoleOpen(true)
  }

  const openEditRole = (record) => {
    setEditingRole(record)
    roleForm.setFieldsValue({ code: record.code, name: record.name, description: record.description })
    setRoleOpen(true)
  }

  const saveRole = async () => {
    const values = await roleForm.validateFields()
    let error
    if (editingRole?.id) {
      ;({ error } = await supabase.from('roles').update(values).eq('id', editingRole.id))
    } else {
      ;({ error } = await supabase.from('roles').insert([values]))
    }
    if (error) return message.error(error.message)
    message.success(editingRole ? 'Đã cập nhật vai trò' : 'Đã thêm vai trò')
    setRoleOpen(false)
    load()
  }

  const removeRole = async (id) => {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa vai trò')
    load()
  }

  const openCreateSetting = () => {
    setEditingSetting(null)
    settingForm.setFieldsValue({ key: '', value: '', group_name: 'general', description: '' })
    setSettingOpen(true)
  }

  const openEditSetting = (record) => {
    setEditingSetting(record)
    settingForm.setFieldsValue({ key: record.key, value: record.value, group_name: record.group_name, description: record.description })
    setSettingOpen(true)
  }

  const saveSetting = async () => {
    const values = await settingForm.validateFields()
    const payload = { ...values, updated_at: new Date().toISOString() }
    let error
    if (editingSetting?.id) {
      ;({ error } = await supabase.from('system_settings').update(payload).eq('id', editingSetting.id))
    } else {
      ;({ error } = await supabase.from('system_settings').insert([{ ...payload, created_at: new Date().toISOString() }]))
    }
    if (error) return message.error(error.message)
    message.success(editingSetting ? 'Đã cập nhật cấu hình' : 'Đã thêm cấu hình')
    setSettingOpen(false)
    load()
  }

  const removeSetting = async (id) => {
    const { error } = await supabase.from('system_settings').delete().eq('id', id)
    if (error) return message.error(error.message)
    message.success('Đã xóa cấu hình')
    load()
  }

  const profileColumns = [
    { title: 'Họ tên', dataIndex: 'full_name', render: (_, r) => <b>{pick(r, ['full_name', 'name'])}</b> },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Điện thoại', dataIndex: 'phone' },
    { title: 'Vai trò', dataIndex: 'role', render: (v) => <Tag color={String(v).toUpperCase().includes('ADMIN') ? 'red' : 'blue'}>{v}</Tag> },
    { title: 'Đơn vị', dataIndex: 'unit' },
    { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v || 'active'}</Tag> },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEditProfile(r)}>Sửa</Button><Popconfirm title="Xóa người dùng này?" onConfirm={() => removeProfile(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const roleColumns = [
    { title: 'Mã vai trò', dataIndex: 'code', render: (v) => <b>{v}</b> },
    { title: 'Tên vai trò', dataIndex: 'name' },
    { title: 'Mô tả', dataIndex: 'description' },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEditRole(r)}>Sửa</Button><Popconfirm title="Xóa vai trò này?" onConfirm={() => removeRole(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const settingColumns = [
    { title: 'Khóa', dataIndex: 'key', render: (v) => <b>{v}</b> },
    { title: 'Giá trị', dataIndex: 'value' },
    { title: 'Nhóm', dataIndex: 'group_name', render: (v) => <Tag>{v}</Tag> },
    { title: 'Mô tả', dataIndex: 'description' },
    { title: 'Thao tác', fixed: 'right', render: (_, r) => <Space><Button icon={<EditOutlined />} onClick={() => openEditSetting(r)}>Sửa</Button><Popconfirm title="Xóa cấu hình này?" onConfirm={() => removeSetting(r.id)}><Button danger icon={<DeleteOutlined />}>Xóa</Button></Popconfirm></Space> },
  ]

  const logColumns = [
    { title: 'Thời gian', dataIndex: 'created_at', render: (v) => v ? new Date(v).toLocaleString('vi-VN') : '' },
    { title: 'Người dùng', dataIndex: 'user_id' },
    { title: 'Hành động', dataIndex: 'action', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Module', dataIndex: 'module' },
    { title: 'Chi tiết', dataIndex: 'detail', render: (v) => v ? JSON.stringify(v) : '' },
  ]

  return <>
    <h1 className="page-title">Quản trị hệ thống</h1>
    <div className="page-subtitle">Quản lý người dùng, vai trò, cấu hình và nhật ký hệ thống</div>

    <div className="stat-grid">
      <Card className="stat-card"><div className="muted">Người dùng</div><h2>{stats.users}</h2></Card>
      <Card className="stat-card"><div className="muted">Đang hoạt động</div><h2>{stats.activeUsers}</h2></Card>
      <Card className="stat-card"><div className="muted">Vai trò</div><h2>{stats.roles}</h2></Card>
      <Card className="stat-card"><div className="muted">Nhật ký</div><h2>{stats.logs}</h2></Card>
    </div>

    <Card className="toolbar-card" style={{ marginBottom: 16 }}>
      <div className="toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Tìm kiếm trong module quản trị..." value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ maxWidth: 420 }} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(`quan-tri-${activeTab}.csv`, filterRows(activeTab === 'profiles' ? profiles : activeTab === 'roles' ? roles : activeTab === 'settings' ? settings : logs))}>Xuất CSV</Button>
          {activeTab === 'profiles' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateProfile}>Thêm người dùng</Button>}
          {activeTab === 'roles' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRole}>Thêm vai trò</Button>}
          {activeTab === 'settings' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSetting}>Thêm cấu hình</Button>}
        </Space>
      </div>
    </Card>

    <Card className="table-card">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'profiles', label: 'Người dùng', children: <Table rowKey="id" loading={loading} columns={profileColumns} dataSource={filterRows(profiles)} scroll={{ x: 1100 }} pagination={{ pageSize: 8 }} /> },
        { key: 'roles', label: 'Vai trò', children: <Table rowKey="id" loading={loading} columns={roleColumns} dataSource={filterRows(roles)} scroll={{ x: 900 }} pagination={{ pageSize: 8 }} /> },
        { key: 'settings', label: 'Cấu hình', children: <Table rowKey="id" loading={loading} columns={settingColumns} dataSource={filterRows(settings)} scroll={{ x: 900 }} pagination={{ pageSize: 8 }} /> },
        { key: 'logs', label: 'Nhật ký', children: <Table rowKey="id" loading={loading} columns={logColumns} dataSource={filterRows(logs)} scroll={{ x: 1100 }} pagination={{ pageSize: 8 }} /> },
      ]} />
    </Card>

    <Modal title={editingProfile ? 'Cập nhật người dùng' : 'Thêm người dùng'} open={profileOpen} onCancel={() => setProfileOpen(false)} onOk={saveProfile} okText="Lưu" cancelText="Hủy" width={760}>
      <Form form={profileForm} layout="vertical">
        <div className="form-grid">
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          <Form.Item name="role" label="Vai trò"><Select options={roles.map((r) => ({ value: r.code, label: r.name || r.code }))} /></Form.Item>
          <Form.Item name="unit" label="Đơn vị"><Input /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngưng hoạt động' }]} /></Form.Item>
        </div>
      </Form>
    </Modal>

    <Modal title={editingRole ? 'Cập nhật vai trò' : 'Thêm vai trò'} open={roleOpen} onCancel={() => setRoleOpen(false)} onOk={saveRole} okText="Lưu" cancelText="Hủy" width={640}>
      <Form form={roleForm} layout="vertical">
        <Form.Item name="code" label="Mã vai trò" rules={[{ required: true, message: 'Nhập mã vai trò' }]}><Input placeholder="VD: ADMIN" /></Form.Item>
        <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Nhập tên vai trò' }]}><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>

    <Modal title={editingSetting ? 'Cập nhật cấu hình' : 'Thêm cấu hình'} open={settingOpen} onCancel={() => setSettingOpen(false)} onOk={saveSetting} okText="Lưu" cancelText="Hủy" width={640}>
      <Form form={settingForm} layout="vertical">
        <Form.Item name="key" label="Khóa cấu hình" rules={[{ required: true, message: 'Nhập khóa cấu hình' }]}><Input placeholder="VD: portal_name" /></Form.Item>
        <Form.Item name="value" label="Giá trị"><Input /></Form.Item>
        <Form.Item name="group_name" label="Nhóm"><Input placeholder="VD: general" /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  </>
}
