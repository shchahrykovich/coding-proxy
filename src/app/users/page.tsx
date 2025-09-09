"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AppLayout from "@/components/AppLayout";
import {
    Button,
    Card,
    Typography,
    Space,
    Spin,
    Table,
    Modal,
    Form,
    Input,
    message,
    Tag
} from "antd";
import {
    PlusOutlined,
    UserOutlined,
    MailOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface User {
    id: string;
    email: string;
    name: string | null;
    emailVerified: string | null;
}

interface CreateUserForm {
    email: string;
    password: string;
    name?: string;
}

export default function UsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data: User[] = await response.json();
                setUsers(data);
            } else {
                message.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            message.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (values: CreateUserForm) => {
        setCreating(true);
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                const newUser: User = await response.json();
                setUsers(prev => [newUser, ...prev]);
                setIsModalVisible(false);
                form.resetFields();
                message.success('User created successfully');
            } else {
                const errorData: any = await response.json();
                message.error(errorData.error || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            message.error('Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = (user: User) => {
        Modal.confirm({
            title: 'Delete User',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Are you sure you want to delete this user?</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Name:</strong> {user.name || 'No name'}</p>
                    <p style={{ color: '#ff4d4f', marginTop: '12px' }}>
                        This action cannot be undone.
                    </p>
                </div>
            ),
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                return new Promise(async (resolve, reject) => {
                    setDeleting(user.id);
                    try {
                        console.log('Deleting user:', user.id);
                        const response = await fetch(`/api/users/${user.id}`, {
                            method: 'DELETE',
                        });

                        console.log('Delete response status:', response.status);

                        if (response.ok) {
                            const result = await response.json();
                            console.log('Delete result:', result);
                            setUsers(prev => prev.filter(u => u.id !== user.id));
                            message.success('User deleted successfully');
                            resolve(true);
                        } else {
                            const errorData: any = await response.json();
                            console.error('Delete error:', errorData);
                            message.error(errorData.error || 'Failed to delete user');
                            reject(new Error(errorData.error || 'Failed to delete user'));
                        }
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        message.error('Failed to delete user');
                        reject(error);
                    } finally {
                        setDeleting(null);
                    }
                });
            },
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string | null, record: User) => (
                <Space>
                    <UserOutlined />
                    <span>{name || 'No name'}</span>
                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email: string) => (
                <Space>
                    <MailOutlined />
                    <span>{email}</span>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'emailVerified',
            key: 'emailVerified',
            render: (emailVerified: string | null) => (
                <Tag color={emailVerified ? 'green' : 'orange'}>
                    {emailVerified ? 'Verified' : 'Unverified'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: any, record: User) => {
                const isCurrentUser = session?.user?.id === record.id;

                if (isCurrentUser) {
                    return (
                        <Tag color="blue" style={{ margin: 0 }}>
                            Current User
                        </Tag>
                    );
                }

                return (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteUser(record)}
                        loading={deleting === record.id}
                        disabled={deleting !== null}
                        title="Delete user"
                    >
                        {deleting === record.id ? 'Deleting...' : 'Delete'}
                    </Button>
                );
            },
        },
    ];

    if (loading) {
        return (
            <AppLayout>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    height: '50vh'
                }}>
                    <Spin size="large" />
                    <Text style={{ marginTop: '16px' }}>Loading users...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Users" icon={<UserOutlined />}>

            <Card
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                    >
                        Add New User
                    </Button>
                }
            >
                <Table
                    dataSource={users}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} users`,
                    }}
                />
            </Card>

            <Modal
                title="Add New User"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateUser}
                    autoComplete="off"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email address' },
                            { type: 'email', message: 'Please enter a valid email address' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined />}
                            placeholder="user@example.com"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: 'Please enter password' },
                            { min: 8, message: 'Password must be at least 8 characters long' }
                        ]}
                    >
                        <Input.Password
                            placeholder="Enter password"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="Name (Optional)"
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Full name"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                onClick={() => {
                                    setIsModalVisible(false);
                                    form.resetFields();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={creating}
                            >
                                {creating ? 'Creating...' : 'Create User'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
