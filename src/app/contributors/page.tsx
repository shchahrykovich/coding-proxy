"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
    Card,
    Typography,
    Spin,
    Table,
    Tag,
    Space,
    message,
    Button,
    Modal,
    Form,
    Input
} from "antd";
import {
    TeamOutlined,
    UserOutlined,
    ApiOutlined,
    IdcardOutlined,
    EditOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Contributor {
    id: number;
    tenantId: number;
    provider: string;
    name: string;
    providerSpecificId: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
}

interface ContributorsResponse {
    contributors: Contributor[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function ContributorsPage() {
    const router = useRouter();
    const [data, setData] = useState<ContributorsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingContributor, setEditingContributor] = useState<Contributor | null>(null);
    const [updating, setUpdating] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchContributors(currentPage, pageSize);
    }, [currentPage, pageSize]);

    const fetchContributors = async (page: number, limit: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/contributors?page=${page}&limit=${limit}`);
            if (response.ok) {
                const responseData: ContributorsResponse = await response.json();
                setData(responseData);
            } else {
                message.error('Failed to fetch contributors');
            }
        } catch (error) {
            console.error('Failed to fetch contributors:', error);
            message.error('Failed to fetch contributors');
        } finally {
            setLoading(false);
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'anthropic': return 'blue';
            case 'openai': return 'green';
            case 'codex': return 'purple';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => (
                <Space>
                    <UserOutlined />
                    <span>{name}</span>
                </Space>
            ),
        },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
            render: (provider: string) => (
                <Tag color={getProviderColor(provider)} icon={<ApiOutlined />}>
                    {provider}
                </Tag>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => (
                <Text type="secondary">
                    {new Date(date).toLocaleDateString()}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: Contributor) => (
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => handleEditClick(record, e)}
                    size="small"
                    title="Edit name"
                >
                    Edit
                </Button>
            ),
        }
    ];

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

    const handleRowClick = (contributor: Contributor) => {
        router.push(`/contributors/${contributor.id}`);
    };

    const handleEditClick = (contributor: Contributor, event: React.MouseEvent) => {
        event.stopPropagation();
        setEditingContributor(contributor);
        form.setFieldsValue({ name: contributor.name });
        setEditModalVisible(true);
    };

    const handleUpdateContributor = async (values: { name: string }) => {
        if (!editingContributor) return;

        setUpdating(true);
        try {
            const response = await fetch(`/api/contributors/${editingContributor.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: values.name }),
            });

            if (response.ok) {
                const updatedContributor: Contributor = await response.json();
                setData(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        contributors: prev.contributors.map(c => 
                            c.id === updatedContributor.id ? updatedContributor : c
                        )
                    };
                });
                setEditModalVisible(false);
                setEditingContributor(null);
                form.resetFields();
                message.success('Contributor name updated successfully');
            } else {
                const errorData: any = await response.json();
                message.error(errorData.error || 'Failed to update contributor');
            }
        } catch (error) {
            console.error('Error updating contributor:', error);
            message.error('Failed to update contributor');
        } finally {
            setUpdating(false);
        }
    };

    const handleModalCancel = () => {
        setEditModalVisible(false);
        setEditingContributor(null);
        form.resetFields();
    };

    if (loading && !data) {
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
                    <Text style={{ marginTop: '16px' }}>Loading contributors...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Contributors" icon={<TeamOutlined />}>
            <Card>
                <Table
                    dataSource={data?.contributors || []}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    onRow={(record) => ({
                        onClick: () => handleRowClick(record),
                        style: { cursor: 'pointer' }
                    })}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: data?.pagination.total || 0,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} contributors`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            <Modal
                title="Edit Contributor Name"
                open={editModalVisible}
                onCancel={handleModalCancel}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdateContributor}
                    autoComplete="off"
                >
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[
                            { required: true, message: 'Please enter contributor name' },
                            { max: 100, message: 'Name is too long' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Enter contributor name"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleModalCancel}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={updating}
                            >
                                {updating ? 'Saving...' : 'Save'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
