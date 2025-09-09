"use client";

import {useEffect, useState, useMemo} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
    Card,
    Typography,
    Spin,
    message,
    Input,
    Pagination,
    Empty,
    Space
} from "antd";
import {
    FolderOutlined,
    SearchOutlined,
    LinkOutlined
} from "@ant-design/icons";
import ReactMarkdown from 'react-markdown';
import {debounce} from 'lodash';

const {Text, Title} = Typography;
const {Search} = Input;

interface MemoryRecord {
    id: number;
    title: string;
    body: string;
    createdAt: string;
    workSessionId: number;
}

interface Project {
    id: number;
    name: string;
}

interface MemoryRecordsResponse {
    project: Project;
    memoryRecords: MemoryRecord[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const projectId = params.id as string;
    const [data, setData] = useState<MemoryRecordsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const debouncedFetch = useMemo(
        () => debounce((page: number, limit: number, search: string) => {
            fetchMemoryRecords(page, limit, search);
        }, 300),
        []
    );

    useEffect(() => {
        debouncedFetch(currentPage, pageSize, searchTerm);
    }, [currentPage, pageSize, searchTerm, debouncedFetch]);

    const fetchMemoryRecords = async (page: number, limit: number, search: string = '') => {
        try {
            setLoading(true);
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
            const response = await fetch(`/api/projects/${projectId}/memory-records?page=${page}&limit=${limit}${searchParam}`);
            if (response.ok) {
                const responseData: MemoryRecordsResponse = await response.json();
                setData(responseData);
            } else if (response.status === 404) {
                message.error('Project not found');
            } else {
                message.error('Failed to fetch memory records');
            }
        } catch (error) {
            console.error('Failed to fetch memory records:', error);
            message.error('Failed to fetch memory records');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const handlePaginationChange = (page: number, size: number) => {
        setCurrentPage(page);
        setPageSize(size);
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
                    <Spin size="large"/>
                    <Text style={{marginTop: '16px'}}>Loading project details...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            title={data?.project.name || 'Project Details'}
            icon={<FolderOutlined/>}
        >
            <div style={{ marginBottom: '24px' }}>
                <Search
                    placeholder="Search memory records..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    onSearch={handleSearch}
                    onChange={(e) => {
                        if (e.target.value === '') {
                            handleSearch('');
                        }
                    }}
                    loading={loading}
                />
            </div>

            {data?.memoryRecords.length === 0 ? (
                <Card>
                    <Empty
                        description={searchTerm ? `No memory records found for "${searchTerm}"` : "No memory records found"}
                    />
                </Card>
            ) : (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {data?.memoryRecords.map((record) => (
                        <Card
                            key={record.id}
                            title={
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {record.title || 'Untitled Memory'}
                                        </Title>
                                        {record.workSessionId > 0 && (
                                            <Link href={`/sessions/${record.workSessionId}`} style={{ color: '#1677ff', textDecoration: 'none' }}>
                                                <LinkOutlined style={{ marginRight: '4px' }} />
                                                session
                                            </Link>
                                        )}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Created: {new Date(record.createdAt).toLocaleString()}
                                    </Text>
                                </div>
                            }
                            loading={loading}
                            style={{ marginBottom: '16px' }}
                        >
                            <div style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                overflow: 'hidden',
                                padding: '8px 0'
                            }}>
                                <ReactMarkdown>
                                    {record.body || 'No content available'}
                                </ReactMarkdown>
                            </div>
                        </Card>
                    ))}
                </Space>
            )}

            {data && data.pagination.total > 0 && (
                <div style={{
                    marginTop: '24px',
                    textAlign: 'center',
                    padding: '16px 0'
                }}>
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={data.pagination.total}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total, range) =>
                            `${range[0]}-${range[1]} of ${total} memory records`
                        }
                        pageSizeOptions={['5', '10', '20', '50']}
                        onChange={handlePaginationChange}
                    />
                </div>
            )}
        </AppLayout>
    );
}
