import React from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Table,
    Space,
    Avatar,
    Tag,
    Typography,
    Spin,
    Alert
} from 'antd';
import {
    BarChartOutlined,
    DatabaseOutlined,
    TeamOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';

const { Text } = Typography;

interface ContributorAnalytics {
    id: number;
    name: string;
    provider: string;
    totalSessions: number;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    lastActivity: string | null;
    averageTokensPerSession: number;
    sessionsOverTime: { date: string; sessions: number }[];
}

interface ContributorAnalyticsResponse {
    contributors: ContributorAnalytics[];
    summary: {
        totalContributors: number;
        totalActiveContributors: number;
        totalSessions: number;
        totalRequests: number;
        totalTokens: number;
    };
}

interface ContributorTabProps {
    contributorData: ContributorAnalyticsResponse | null;
    contributorLoading: boolean;
    contributorError: string | null;
    formatNumber: (num: number) => string;
    chartKey: number;
}

export default function ContributorTab({
    contributorData,
    contributorLoading,
    contributorError,
    formatNumber,
    chartKey
}: ContributorTabProps) {
    if (contributorLoading && !contributorData) {
        return (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <Spin size="large" />
                <Text style={{ display: 'block', marginTop: '16px' }}>Loading contributor analytics...</Text>
            </div>
        );
    }

    if (contributorError) {
        return (
            <Alert
                message="Error Loading Contributor Analytics"
                description={contributorError}
                type="error"
                showIcon
            />
        );
    }

    if (!contributorData) {
        return (
            <Alert
                message="No Contributor Data Available"
                description="No contributor analytics data found"
                type="info"
                showIcon
            />
        );
    }

    return (
        <>
            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Contributors"
                            value={contributorData.summary.totalContributors}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Active Contributors"
                            value={contributorData.summary.totalActiveContributors}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Sessions"
                            value={contributorData.summary.totalSessions}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Tokens"
                            value={contributorData.summary.totalTokens}
                            prefix={<BarChartOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Contributors Table */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card title="Contributors Performance">
                        <Table
                            dataSource={contributorData.contributors.reduce((acc: any[], contributor) => {
                                const existing = acc.find(item => item.name === contributor.name);
                                if (existing) {
                                    // Aggregate data for same name
                                    existing.totalSessions += contributor.totalSessions;
                                    existing.totalRequests += contributor.totalRequests;
                                    existing.totalInputTokens += contributor.totalInputTokens;
                                    existing.totalOutputTokens += contributor.totalOutputTokens;
                                    existing.totalTokens += contributor.totalTokens;
                                    existing.averageTokensPerSession = existing.totalTokens / existing.totalSessions;
                                    // Keep most recent activity
                                    if (!existing.lastActivity || (contributor.lastActivity && new Date(contributor.lastActivity) > new Date(existing.lastActivity))) {
                                        existing.lastActivity = contributor.lastActivity;
                                    }
                                    // Combine providers
                                    if (!existing.providers.includes(contributor.provider)) {
                                        existing.providers.push(contributor.provider);
                                    }
                                } else {
                                    acc.push({
                                        ...contributor,
                                        providers: [contributor.provider]
                                    });
                                }
                                return acc;
                            }, [])}
                            columns={[
                                {
                                    title: 'Contributor',
                                    key: 'contributor',
                                    render: (record: any) => (
                                        <Space>
                                            <Avatar icon={<UserOutlined />} size="small" />
                                            <div>
                                                <Text strong>{record.name}</Text>
                                                <br />
                                                <Space size={4}>
                                                    {record.providers.map((provider: string) => (
                                                        <Tag key={provider} color="blue">{provider}</Tag>
                                                    ))}
                                                </Space>
                                            </div>
                                        </Space>
                                    ),
                                },
                                {
                                    title: 'Sessions',
                                    dataIndex: 'totalSessions',
                                    key: 'totalSessions',
                                    sorter: (a: any, b: any) => a.totalSessions - b.totalSessions,
                                },
                                {
                                    title: 'Requests',
                                    dataIndex: 'totalRequests',
                                    key: 'totalRequests',
                                    render: (value: number) => formatNumber(value),
                                    sorter: (a: any, b: any) => a.totalRequests - b.totalRequests,
                                },
                                {
                                    title: 'Total Tokens',
                                    dataIndex: 'totalTokens',
                                    key: 'totalTokens',
                                    render: (value: number) => formatNumber(value),
                                    sorter: (a: any, b: any) => a.totalTokens - b.totalTokens,
                                },
                                {
                                    title: 'Avg Tokens/Session',
                                    dataIndex: 'averageTokensPerSession',
                                    key: 'averageTokensPerSession',
                                    render: (value: number) => formatNumber(Math.round(value)),
                                    sorter: (a: any, b: any) => a.averageTokensPerSession - b.averageTokensPerSession,
                                },
                                {
                                    title: 'Last Activity',
                                    dataIndex: 'lastActivity',
                                    key: 'lastActivity',
                                    render: (date: string | null) => date ? new Date(date).toLocaleDateString() : 'Never',
                                },
                            ]}
                            rowKey="name"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} contributors`,
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Top Contributors Chart */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Top Contributors by Tokens">
                        {(() => {
                            const groupedContributors = contributorData.contributors.reduce((acc: any[], contributor) => {
                                const existing = acc.find(item => item.name === contributor.name);
                                if (existing) {
                                    existing.totalInputTokens += contributor.totalInputTokens;
                                    existing.totalOutputTokens += contributor.totalOutputTokens;
                                    existing.totalTokens += contributor.totalTokens;
                                } else {
                                    acc.push({
                                        ...contributor
                                    });
                                }
                                return acc;
                            }, []).slice(0, 10);

                            return (
                                <Column
                                    key={`contributor-column-${chartKey}`}
                                    data={[
                                        ...groupedContributors.map(c => ({
                                            name: c.name,
                                            type: 'Input Tokens',
                                            tokens: c.totalInputTokens
                                        })),
                                        ...groupedContributors.map(c => ({
                                            name: c.name,
                                            type: 'Output Tokens',
                                            tokens: c.totalOutputTokens
                                        }))
                                    ]}
                                    height={300}
                                    xField="name"
                                    yField="tokens"
                                    seriesField="type"
                                    isStack={true}
                                    xAxis={{
                                        label: {
                                            autoRotate: true,
                                        }
                                    }}
                                    yAxis={{
                                        tickFormatter: (value: number) => formatNumber(value)
                                    }}
                                />
                            );
                        })()}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Contributors by Provider">
                        {(() => {
                            const groupedContributors = contributorData.contributors.reduce((acc: any[], contributor) => {
                                const existing = acc.find(item => item.name === contributor.name);
                                if (existing) {
                                    if (!existing.providers.includes(contributor.provider)) {
                                        existing.providers.push(contributor.provider);
                                    }
                                } else {
                                    acc.push({
                                        ...contributor,
                                        providers: [contributor.provider]
                                    });
                                }
                                return acc;
                            }, []);

                            const providerCounts = groupedContributors.reduce((acc: any[], contributor) => {
                                contributor.providers.forEach((provider: string) => {
                                    const existing = acc.find(item => item.provider === provider);
                                    if (existing) {
                                        existing.count += 1;
                                    } else {
                                        acc.push({ provider, count: 1 });
                                    }
                                });
                                return acc;
                            }, []);

                            return (
                                <Pie
                                    key={`contributor-pie-${chartKey}`}
                                    data={providerCounts}
                                    height={300}
                                    angleField="count"
                                    colorField="provider"
                                    radius={0.8}
                                    label={false}
                                />
                            );
                        })()}
                    </Card>
                </Col>
            </Row>
        </>
    );
}
