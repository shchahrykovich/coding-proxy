"use client";

import {Table, Tag, Tooltip, Typography} from "antd";

const {Text} = Typography;

interface WorkSessionAnalytics {
    title?: string;
    type?: string;
    totalTools?: number;
    projects?: string[];
    topics?: string[];
    [key: string]: any;
}

export interface Session {
    id: number;
    name: string;
    provider: string;
    title: string;
    contributorId: string;
    contributorName?: string;
    contributorProvider?: string;
    accountId: string;
    project?: string;
    requestCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    createdAt: string;
    lastReceivedRequestAt: string;
    updatedAt: string;
    analytics?: WorkSessionAnalytics;
}

interface SessionsTableProps {
    sessions: Session[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    total: number;
    onRowClick: (record: Session) => void;
    onTableChange: (pagination: any) => void;
    variant?: 'default' | 'contributor';
}

export default function SessionsTable({
    sessions,
    loading,
    currentPage,
    pageSize,
    total,
    onRowClick,
    onTableChange,
    variant = 'default'
}: SessionsTableProps) {
    const getDefaultColumns = () => [
        {
            title: 'Session',
            key: 'session',
            render: (_: any, record: Session) => (
                <Text strong>
                    {record.title}
                </Text>
            ),
        },
        {
            title: 'Contributor',
            key: 'contributor',
            render: (_: any, record: Session) => (
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', width: '100%'}}>
                    <Text strong>{record.contributorName}</Text>
                </div>
            ),
        },
        {
            title: 'Project',
            key: 'projects',
            render: (_: any, record: Session) => {
                const project = record.project;
                if (project) {
                    return (<Tag color="green">{project}</Tag>);
                }
                return <Text type="secondary">N/A</Text>;
            },
        },
        {
            title: 'Tokens',
            key: 'modelUsage',
            render: (_: any, record: Session) => {
                const totalTokens = record.totalInputTokens + record.totalOutputTokens;
                return (
                    <Tooltip>
                        <div>
                            <Text strong>{totalTokens.toLocaleString()}</Text>
                            <Text type="secondary" style={{fontSize: '12px', display: 'block'}}>
                                total tokens
                            </Text>
                        </div>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Last Request',
            dataIndex: 'lastReceivedRequestAt',
            key: 'lastReceivedRequestAt',
            render: (lastReceivedRequestAt: string) => (
                <Tooltip title={`Last request: ${new Date(lastReceivedRequestAt).toLocaleString()}`}>
                    <div>
                        <Text>{new Date(lastReceivedRequestAt).toLocaleDateString()}</Text>
                        <Text type="secondary" style={{fontSize: '12px', display: 'block'}}>
                            {new Date(lastReceivedRequestAt).toLocaleTimeString()}
                        </Text>
                    </div>
                </Tooltip>
            ),
        },
    ];

    const getContributorColumns = () => [
        {
            title: 'Session',
            key: 'session',
            width: 300,
            render: (_: any, record: Session) => (
                <Text strong>
                    {record.title || record.analytics?.title || record.name}
                </Text>
            ),
        },
        {
            title: 'Project',
            key: 'project',
            width: 120,
            render: (_: any, record: Session) => {
                if (record.project) {
                    return <Tag color="green">{record.project}</Tag>;
                }
                const projects = record.analytics?.projects;
                if (projects && projects.length > 0) {
                    return projects.map((project: string, idx: number) => (
                        <Tag key={`project-${idx}`} color="green">{project}</Tag>
                    ));
                }
                return <Text type="secondary">N/A</Text>;
            },
        },
        {
            title: 'Type',
            key: 'type',
            width: 100,
            render: (_: any, record: Session) => {
                if(record.analytics?.type) {
                    return record.analytics.type.split(';').map((word: string) => (
                        <Tag key={`type-${word}`} color="blue">{word}</Tag>
                    ));
                }
                return <Text type="secondary">N/A</Text>;
            },
        },
        {
            title: 'Tokens',
            key: 'tokens',
            width: 120,
            render: (_: any, record: Session) => {
                const totalTokens = record.totalInputTokens + record.totalOutputTokens;
                return (
                    <Tooltip
                        title={
                            <div>
                                <div><strong>Input:</strong> {record.totalInputTokens.toLocaleString()}</div>
                                <div><strong>Output:</strong> {record.totalOutputTokens.toLocaleString()}</div>
                            </div>
                        }
                    >
                        <div>
                            <Text strong>{totalTokens.toLocaleString()}</Text>
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                total tokens
                            </Text>
                        </div>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Requests',
            dataIndex: 'requestCount',
            key: 'requestCount',
            width: 100,
            render: (count: number) => (
                <Text strong>{count}</Text>
            ),
        },
        {
            title: 'Last Activity',
            dataIndex: 'lastReceivedRequestAt',
            key: 'lastReceivedRequestAt',
            width: 140,
            render: (lastReceivedRequestAt: string) => (
                <Tooltip title={`Last request: ${new Date(lastReceivedRequestAt).toLocaleString()}`}>
                    <div>
                        <Text>{new Date(lastReceivedRequestAt).toLocaleDateString()}</Text>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                            {new Date(lastReceivedRequestAt).toLocaleTimeString()}
                        </Text>
                    </div>
                </Tooltip>
            ),
        },
    ];

    const columns = variant === 'contributor' ? getContributorColumns() : getDefaultColumns();
    const scrollX = variant === 'contributor' ? 1000 : 1150;

    return (
        <Table
            dataSource={sessions}
            columns={columns}
            rowKey="id"
            loading={loading}
            onRow={(record) => ({
                onClick: () => onRowClick(record),
                style: {cursor: 'pointer'},
            })}
            pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} sessions`,
                pageSizeOptions: ['10', '20', '50', '100'],
            }}
            onChange={onTableChange}
            scroll={{x: scrollX}}
            size="middle"
        />
    );
}
