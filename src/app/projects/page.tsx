"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
    Card,
    Typography,
    Spin,
    message,
    Table,
    TableColumnsType,
    Button
} from "antd";
import {
    FolderOutlined
} from "@ant-design/icons";

const {Text} = Typography;

interface Project {
    id: number;
    name: string;
    createdAt: string;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    memoryRecordsCount: number;
}

interface ProjectsResponse {
    projects: Project[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function ProjectsPage() {
    const [data, setData] = useState<ProjectsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const router = useRouter();

    useEffect(() => {
        fetchProjects(currentPage, pageSize);
    }, [currentPage, pageSize]);

    const fetchProjects = async (page: number, limit: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/projects?page=${page}&limit=${limit}`);
            if (response.ok) {
                const responseData: ProjectsResponse = await response.json();
                setData(responseData);
            } else {
                message.error('Failed to fetch projects');
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            message.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

    const handleRowClick = (record: Project) => {
        router.push(`/projects/${record.id}`);
    };

    const columns: TableColumnsType<Project> = [
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => text || 'Unnamed Project',
        },
        {
            title: 'Memory Records',
            dataIndex: 'memoryRecordsCount',
            key: 'memoryRecordsCount',
            render: (count: number) => count.toLocaleString(),
        },
        {
            title: 'Total Requests',
            dataIndex: 'totalRequests',
            key: 'totalRequests',
            render: (count: number) => count.toLocaleString(),
        },
        {
            title: 'Input Tokens',
            dataIndex: 'totalInputTokens',
            key: 'totalInputTokens',
            render: (tokens: number) => tokens.toLocaleString(),
        },
        {
            title: 'Output Tokens',
            dataIndex: 'totalOutputTokens',
            key: 'totalOutputTokens',
            render: (tokens: number) => tokens.toLocaleString(),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString(),
        },
    ];

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
                    <Spin size="large"/>
                    <Text style={{marginTop: '16px'}}>Loading projects...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Projects" icon={<FolderOutlined/>}>
            <Card>
                <Table
                    columns={columns}
                    dataSource={data?.projects || []}
                    rowKey="id"
                    loading={loading}
                    onRow={(record) => ({
                        onClick: () => handleRowClick(record),
                        style: { cursor: 'pointer' },
                    })}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: data?.pagination.total || 0,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} projects`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    onChange={handleTableChange}
                    size="middle"
                />
            </Card>
        </AppLayout>
    );
}