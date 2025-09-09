import React from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Table,
    Typography,
    Alert,
    Progress
} from 'antd';
import {
    BarChartOutlined,
    DatabaseOutlined,
    TrophyOutlined,
    BulbOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import type { AnalyticsResponse } from '../../app/api/analytics/dtos';

const { Text } = Typography;

interface WorkTypeTabProps {
    data: AnalyticsResponse;
    formatNumber: (num: number) => string;
    chartKey: number;
}

export default function WorkTypeTab({ data, formatNumber, chartKey }: WorkTypeTabProps) {
    if (!data?.workTypeStats || data.workTypeStats.length === 0) {
        return (
            <Alert
                message="No Work Type Data Available"
                description="No work type analytics data found"
                type="info"
                showIcon
            />
        );
    }

    return (
        <>
            {/* Work Type Overview */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Work Types"
                            value={data.workTypeStats.length}
                            prefix={<BulbOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Most Common Type"
                            value={data.workTypeStats[0]?.workType || 'N/A'}
                            prefix={<TrophyOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Sessions"
                            value={data.workTypeStats.reduce((sum, wt) => sum + wt.sessions, 0)}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Tokens"
                            value={data.workTypeStats.reduce((sum, wt) => sum + wt.totalTokens, 0)}
                            prefix={<BarChartOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Work Type Table */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card title="Work Type Analytics">
                        <Table
                            dataSource={data.workTypeStats}
                            rowKey="workType"
                            pagination={{
                                pageSize: 50,
                                showSizeChanger: false,
                                showQuickJumper: false,
                            }}
                            columns={[
                                {
                                    title: 'Work Type',
                                    dataIndex: 'workType',
                                    key: 'workType',
                                    render: (workType: string) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <BulbOutlined style={{ color: '#1890ff' }} />
                                            <Text strong>{workType}</Text>
                                        </div>
                                    ),
                                },
                                {
                                    title: 'Sessions',
                                    dataIndex: 'sessions',
                                    key: 'sessions',
                                    sorter: (a: any, b: any) => a.sessions - b.sessions,
                                    defaultSortOrder: 'descend' as const,
                                },
                                {
                                    title: 'Total Tokens',
                                    dataIndex: 'totalTokens',
                                    key: 'totalTokens',
                                    render: (value: number) => formatNumber(value),
                                    sorter: (a: any, b: any) => a.totalTokens - b.totalTokens,
                                },
                                {
                                    title: '% Sessions',
                                    dataIndex: 'percentage',
                                    key: 'percentage',
                                    render: (percentage: number) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Progress
                                                percent={percentage}
                                                size="small"
                                                style={{ width: '100px' }}
                                                showInfo={false}
                                            />
                                            <Text>{percentage}%</Text>
                                        </div>
                                    ),
                                    sorter: (a: any, b: any) => a.percentage - b.percentage,
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Work Types Distribution">
                        <Pie
                            key={`worktype-pie-${chartKey}`}
                            data={data.workTypeStats.slice(0, 10)}
                            height={300}
                            angleField="sessions"
                            colorField="workType"
                            radius={0.8}
                            interactions={[{ type: 'element-active' }]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Work Types by Token Usage">
                        <Column
                            key={`worktype-column-${chartKey}`}
                            data={data.workTypeStats.slice(0, 10)}
                            height={300}
                            xField="workType"
                            yField="totalTokens"
                            xAxis={{
                                label: {
                                    autoRotate: true,
                                }
                            }}
                            yAxis={{
                                tickFormatter: (value: number) => formatNumber(value)
                            }}
                            label={{
                                position: 'top',
                                text: (datum: any) => formatNumber(datum.totalTokens),
                            }}
                        />
                    </Card>
                </Col>
            </Row>
        </>
    );
}
