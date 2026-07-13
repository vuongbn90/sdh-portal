import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Popconfirm, Space, Table } from 'antd'

export default function GenericTableTab({ loading, data, columns, onAdd, onEdit, onDelete, addText = 'Thêm' }) {
  const actionCol = {
    title: 'Thao tác',
    width: 170,
    fixed: 'right',
    render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)}>Sửa</Button>
        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy" onConfirm={() => onDelete(r)}>
          <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      </Space>
    ),
  }
  return (
    <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>{addText}</Button>}>
      <Table rowKey="id" loading={loading} dataSource={data} columns={[...columns, actionCol]} scroll={{ x: 1100 }} />
    </Card>
  )
}
