"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
    Button,
    Card,
    Typography,
    Space,
    Spin,
    Table,
    Tag,
    message,
    Tooltip,
    Modal,
    Form,
    Input
} from "antd";
import {
    PlusOutlined,
    ApiOutlined,
    CopyOutlined,
    UserOutlined,
    TeamOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Proxy {
    id: number;
    tenantId: number;
    name: string | null;
    userId: string | null;
    apiKey: string;
    createdAt: string;
    updatedAt: string;
    totalRequests: number | undefined;
}

export default function ProxiesPage() {
    const [proxies, setProxies] = useState<Proxy[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();

    useEffect(() => {
        fetchProxies();
    }, []);

    const fetchProxies = async () => {
        try {
            const response = await fetch('/api/proxies');
            if (response.ok) {
                const data: Proxy[] = await response.json();
                setProxies(data);
            } else {
                message.error('Failed to fetch proxies');
            }
        } catch (error) {
            console.error('Failed to fetch proxies:', error);
            message.error('Failed to fetch proxies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProxy = async (values: { name?: string }) => {
        setCreating(true);
        try {
            const response = await fetch('/api/proxies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: values.name || null }),
            });

            if (response.ok) {
                const newProxy: Proxy = await response.json();
                setProxies(prev => [newProxy, ...prev]);
                setIsCreateModalVisible(false);
                createForm.resetFields();
                message.success('Proxy created successfully');
            } else {
                const errorData: any = await response.json();
                message.error(errorData.error || 'Failed to create proxy');
            }
        } catch (error) {
            console.error('Error creating proxy:', error);
            message.error('Failed to create proxy');
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('Copied to clipboard');
    };

    const handleDeleteProxy = (proxy: Proxy) => {
        Modal.confirm({
            title: 'Delete Proxy',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Are you sure you want to delete this proxy?</p>
                    <p><strong>Name:</strong> {proxy.name || 'Unnamed Proxy'}</p>
                    <p><strong>API Key:</strong> {proxy.apiKey.substring(0, 20)}...</p>
                    <p><strong>Total Requests:</strong> {proxy.totalRequests || 0}</p>
                    <p style={{ color: '#ff4d4f', marginTop: '12px' }}>
                        This action cannot be undone and will delete all associated requests and sessions.
                    </p>
                </div>
            ),
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                return new Promise(async (resolve, reject) => {
                    setDeleting(proxy.id);
                    try {
                        console.log('Deleting proxy:', proxy.id);
                        const response = await fetch(`/api/proxies/${proxy.id}`, {
                            method: 'DELETE',
                        });

                        console.log('Delete response status:', response.status);

                        if (response.ok) {
                            const result = await response.json();
                            console.log('Delete result:', result);
                            setProxies(prev => prev.filter(p => p.id !== proxy.id));
                            message.success('Proxy deleted successfully');
                            resolve(true);
                        } else {
                            const errorData: any = await response.json();
                            console.error('Delete error:', errorData);
                            message.error(errorData.error || 'Failed to delete proxy');
                            reject(new Error(errorData.error || 'Failed to delete proxy'));
                        }
                    } catch (error) {
                        console.error('Error deleting proxy:', error);
                        message.error('Failed to delete proxy');
                        reject(error);
                    } finally {
                        setDeleting(null);
                    }
                });
            },
        });
    };

    const getEndpointUrl = (apiKey: string, provider: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.protocol}//${window.location.host}/api/proxy/${apiKey}/${provider}`;
        }
        return `/api/proxy/${apiKey}/${provider}`;
    };


    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (name: string | null) => (
                <Text strong>{name || 'Unnamed Proxy'}</Text>
            ),
        },
        {
            title: 'API Key',
            dataIndex: 'apiKey',
            key: 'apiKey',
            width: 200,
            render: (apiKey: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text title={apiKey} code style={{ fontSize: '12px' }}>
                        {apiKey.substring(0, 20)}...
                    </Text>
                    <Tooltip title="Copy API Key">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(apiKey)}
                        />
                    </Tooltip>
                </div>
            ),
        },
        {
            title: 'ANTHROPIC_BASE_URL',
            key: 'ANTHROPIC_BASE_URL',
            width: 200,
            render: (_: any, record: Proxy) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text code title={getEndpointUrl(record.apiKey, 'anthropic')} style={{ fontSize: '11px', flex: 1 }}>
                        {getEndpointUrl(record.apiKey, 'anthropic').substring(0, 20)}...
                    </Text>
                    <Tooltip title="Copy Anthropic endpoint URL">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(getEndpointUrl(record.apiKey, 'anthropic'))}
                        />
                    </Tooltip>
                </div>
            ),
        },
        {
            title: 'Scope',
            dataIndex: 'userId',
            key: 'scope',
            width: 100,
            render: (userId: string | null) => (
                <Tag
                    color={userId ? 'green' : 'orange'}
                    icon={userId ? <UserOutlined /> : <TeamOutlined />}
                >
                    {userId ? 'User' : 'Tenant'}
                </Tag>
            ),
        },
        {
            title: 'Total Requests',
            dataIndex: 'totalRequests',
            key: 'totalRequests',
            width: 120,
            render: (totalRequests: number | undefined) => (
                <Text strong>{(totalRequests || 0).toLocaleString()}</Text>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (createdAt: string) => (
                <Text type="secondary">
                    {new Date(createdAt).toLocaleDateString()}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: Proxy) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteProxy(record)}
                    loading={deleting === record.id}
                    disabled={deleting !== null}
                    title="Delete proxy"
                >
                    {deleting === record.id ? 'Deleting...' : 'Delete'}
                </Button>
            ),
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
                    <Text style={{ marginTop: '16px' }}>Loading proxies...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Proxies" icon={<ApiOutlined />}>

            <Card
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsCreateModalVisible(true)}
                    >
                        Create New Proxy
                    </Button>
                }
            >
                <Table
                    dataSource={proxies}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} proxies`,
                    }}
                    scroll={{ x: 800 }}
                />
            </Card>

            <Modal
                title="Create New Proxy"
                open={isCreateModalVisible}
                onCancel={() => {
                    setIsCreateModalVisible(false);
                    createForm.resetFields();
                }}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateProxy}
                    autoComplete="off"
                >
                    <Form.Item
                        name="name"
                        label="Proxy Name (Optional)"
                        rules={[
                            { max: 100, message: 'Name cannot exceed 100 characters' }
                        ]}
                    >
                        <Input
                            placeholder="Enter a name for this proxy"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                onClick={() => {
                                    setIsCreateModalVisible(false);
                                    createForm.resetFields();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={creating}
                            >
                                {creating ? 'Creating...' : 'Create Proxy'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
