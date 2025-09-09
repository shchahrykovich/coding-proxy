import React from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Table
} from 'antd';
import {
    BarChartOutlined,
    ApiOutlined,
    DatabaseOutlined,
    ClockCircleOutlined,
    LineChartOutlined
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';
import type { AnalyticsResponse } from '../../app/api/analytics/dtos';

interface OverviewTabProps {
    data: AnalyticsResponse;
    formatNumber: (num: number) => string;
    chartKey: number;
}

export default function OverviewTab({ data, formatNumber, chartKey }: OverviewTabProps) {
    const topProxiesColumns = [
        {
            title: 'Proxy',
            dataIndex: 'name',
            key: 'name',
            render: (name: string | null, record: any) => name || `Proxy #${record.id}`,
        },
        {
            title: 'Requests',
            dataIndex: 'requests',
            key: 'requests',
            render: (requests: number) => formatNumber(requests),
            sorter: (a: any, b: any) => a.requests - b.requests,
        },
        {
            title: 'Percentage',
            dataIndex: 'percentage',
            key: 'percentage',
            render: (percentage: number) => `${percentage}%`,
        },
    ];

    const projectsColumns = [
        {
            title: 'Project',
            dataIndex: 'project',
            key: 'project',
        },
        {
            title: 'Sessions',
            dataIndex: 'sessions',
            key: 'sessions',
            sorter: (a: any, b: any) => a.sessions - b.sessions,
        },
    ];

    return (
        <>
            {/* Overview Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Requests"
                            value={data?.overview.totalRequests || 0}
                            prefix={<ApiOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Proxies"
                            value={data?.overview.totalProxies || 0}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Tokens"
                            value={data?.overview.totalTokensUsed || 0}
                            prefix={<BarChartOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Avg Requests/Day"
                            value={data?.overview.averageRequestsPerDay || 0}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Sessions"
                            value={data?.workSessionStats.totalSessions || 0}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Avg Tokens/Session"
                            value={data?.workSessionStats.averageTokensPerSession || 0}
                            prefix={<LineChartOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} lg={8}>
                    <Card title="Top Projects" styles={{ body: { height: 300, overflow: 'auto' } }}>
                        <Table
                            dataSource={data?.workSessionStats.topProjects || []}
                            columns={projectsColumns}
                            pagination={false}
                            size="small"
                            showHeader={false}
                            rowKey="project"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card title="Requests by Provider">
                        {data?.requestsByProvider && (
                            <Pie
                                key={`pie-${chartKey}`}
                                data={data.requestsByProvider}
                                height={247}
                                angleField="requests"
                                colorField="provider"
                                radius={0.8}
                                label={false}
                                interactions={[{ type: 'element-active' }]}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card title="Top Proxies by Usage"
                          styles={{ body: { height: 300, overflow: 'auto' } }}>
                        <Table
                            dataSource={data?.topProxies?.slice(0, 10) || []}
                            columns={topProxiesColumns}
                            pagination={false}
                            size="small"
                            rowKey="id"
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                {/* Requests Over Time */}
                <Col xs={24} lg={24}>
                    <Card title="Requests Over Time">
                        {data?.requestsOverTime && (
                            <Line
                                key={`line-${chartKey}`}
                                data={data.requestsOverTime}
                                height={300}
                                xField="date"
                                yField="requests"
                                point={{ size: 5, shape: 'diamond' }}
                                label={{
                                    style: {
                                        fill: '#aaa',
                                    },
                                    name: 'requests',
                                }}
                                xAxis={{
                                    tickFormatter: (value: string) => new Date(value).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                }}
                                yAxis={{
                                    tickFormatter: (value: number) => formatNumber(value)
                                }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                {/* Token Usage */}
                <Col xs={24} lg={12}>
                    <Card title="Token Usage by Provider">
                        {data?.tokenUsage?.tokensByProvider && (
                            <Column
                                key={`column-${chartKey}`}
                                data={[
                                    ...data.tokenUsage.tokensByProvider.map(item => ({
                                        provider: item.provider,
                                        type: 'Input Tokens',
                                        tokens: item.inputTokens
                                    })),
                                    ...data.tokenUsage.tokensByProvider.map(item => ({
                                        provider: item.provider,
                                        type: 'Output Tokens',
                                        tokens: item.outputTokens
                                    }))
                                ]}
                                label={{
                                    text: (datum: any) => `${datum.tokens || 'Unknown'}`,
                                }}
                                height={300}
                                xField="provider"
                                yField="tokens"
                                seriesField="type"
                                isStack={true}
                                yAxis={{
                                    tickFormatter: (value: number) => formatNumber(value)
                                }}
                            />
                        )}
                    </Card>
                </Col>
                {/* Client Version Distribution */}
                <Col xs={24} lg={12}>
                    <Card title="Requests by Client Version">
                        {data?.requestsByClientVersion && (
                            <Pie
                                key={`client-version-pie-${chartKey}`}
                                data={data.requestsByClientVersion}
                                height={300}
                                angleField="requests"
                                colorField="clientVersion"
                                radius={0.8}
                                label={false}
                                legend={{
                                    position: 'bottom',
                                }}
                                interactions={[{ type: 'element-active' }]}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </>
    );
}
