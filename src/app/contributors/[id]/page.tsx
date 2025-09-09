"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import SessionsTable, {Session} from "@/components/SessionsTable";
import {
    Button,
    Card,
    Typography,
    Space,
    Spin,
    Tag,
    message,
    Tooltip,
    Breadcrumb,
    Row,
    Col
} from "antd";
import {
    TeamOutlined,
    DatabaseOutlined,
    UserOutlined,
    ApiOutlined,
    IdcardOutlined,
    ArrowLeftOutlined,
    EyeOutlined
} from "@ant-design/icons";
import Link from "next/link";

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


interface ContributorSessionsResponse {
    sessions: Session[];
    contributor: Contributor;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function ContributorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [data, setData] = useState<ContributorSessionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        fetchContributorSessions(currentPage, pageSize);
    }, [resolvedParams.id, currentPage, pageSize]);

    const fetchContributorSessions = async (page: number, limit: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/contributors/${resolvedParams.id}/sessions?page=${page}&limit=${limit}`);
            if (response.ok) {
                const responseData: ContributorSessionsResponse = await response.json();
                setData(responseData);
            } else {
                message.error('Failed to fetch contributor sessions');
            }
        } catch (error) {
            console.error('Failed to fetch contributor sessions:', error);
            message.error('Failed to fetch contributor sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (record: Session) => {
        router.push(`/sessions/${record.id}`);
    };

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

    const getProviderColor = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'anthropic': return 'blue';
            case 'openai': return 'green';
            case 'codex': return 'purple';
            default: return 'default';
        }
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
                    <Text style={{ marginTop: '16px' }}>Loading contributor details...</Text>
                </div>
            </AppLayout>
        );
    }

    const contributor = data?.contributor;

    return (
        <AppLayout title={`Contributor: ${contributor?.name}`}>
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Space size="large" style={{ marginTop: '16px' }}>
                                    <div>
                                        <Text type="secondary">Provider:</Text>
                                        <br />
                                        <Tag color={getProviderColor(contributor?.provider || '')} icon={<ApiOutlined />}>
                                            {contributor?.provider}
                                        </Tag>
                                    </div>
                                    <div>
                                        <Text type="secondary">Total Sessions:</Text>
                                        <br />
                                        <Text strong style={{ fontSize: '16px' }}>{data?.pagination.total || 0}</Text>
                                    </div>
                                </Space>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DatabaseOutlined style={{ marginRight: '8px' }} />
                    Sessions
                </div>
            }>
                <SessionsTable
                    sessions={data?.sessions || []}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={data?.pagination.total || 0}
                    onRowClick={handleRowClick}
                    onTableChange={handleTableChange}
                    variant="contributor"
                />
            </Card>
        </AppLayout>
    );
}
