import React from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Table
} from 'antd';
import {
    ApiOutlined,
    DatabaseOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import { Pie, Column } from '@ant-design/plots';
import type { AnalyticsResponse } from '../../app/api/analytics/dtos';

interface ModelUsageTabProps {
    data: AnalyticsResponse;
    formatNumber: (num: number) => string;
    chartKey: number;
}

export default function ModelUsageTab({ data, formatNumber, chartKey }: ModelUsageTabProps) {
    const filteredModelStats = data?.modelUsage?.modelStats?.filter(model =>
        model.inputTokens > 0 || model.outputTokens > 0
    ) || [];

    const filteredUsageByProvider = data?.modelUsage?.usageByProvider?.filter(provider =>
        provider.inputTokens > 0 || provider.outputTokens > 0
    ) || [];

    const modelStatsColumns = [
        {
            title: 'Model Name',
            dataIndex: 'modelName',
            key: 'modelName',
            render: (modelName: string) => modelName || 'Unknown',
        },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
        },
        {
            title: 'Total Usage',
            dataIndex: 'totalUsage',
            key: 'totalUsage',
            render: (totalUsage: number) => formatNumber(totalUsage),
            sorter: (a: any, b: any) => a.totalUsage - b.totalUsage,
        },
        {
            title: 'Input Tokens',
            dataIndex: 'inputTokens',
            key: 'inputTokens',
            render: (inputTokens: number) => formatNumber(inputTokens),
            sorter: (a: any, b: any) => a.inputTokens - b.inputTokens,
        },
        {
            title: 'Output Tokens',
            dataIndex: 'outputTokens',
            key: 'outputTokens',
            render: (outputTokens: number) => formatNumber(outputTokens),
            sorter: (a: any, b: any) => a.outputTokens - b.outputTokens,
        },
        {
            title: 'Percentage',
            dataIndex: 'percentage',
            key: 'percentage',
            render: (percentage: number) => `${percentage}%`,
        },
    ];

    const providerUsageColumns = [
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
        },
        {
            title: 'Total Usage',
            dataIndex: 'totalUsage',
            key: 'totalUsage',
            render: (totalUsage: number) => formatNumber(totalUsage),
            sorter: (a: any, b: any) => a.totalUsage - b.totalUsage,
        },
        {
            title: 'Input Tokens',
            dataIndex: 'inputTokens',
            key: 'inputTokens',
            render: (inputTokens: number) => formatNumber(inputTokens),
            sorter: (a: any, b: any) => a.inputTokens - b.inputTokens,
        },
        {
            title: 'Output Tokens',
            dataIndex: 'outputTokens',
            key: 'outputTokens',
            render: (outputTokens: number) => formatNumber(outputTokens),
            sorter: (a: any, b: any) => a.outputTokens - b.outputTokens,
        },
        {
            title: 'Models',
            dataIndex: 'models',
            key: 'models',
        },
    ];

    const totalTokensFromModels = filteredModelStats.reduce((sum, model) => sum + model.totalUsage, 0);
    const totalModelsWithUsage = filteredModelStats.length;

    return (
        <>
            {/* Overview Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Models"
                            value={totalModelsWithUsage}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Total Token Usage"
                            value={totalTokensFromModels}
                            prefix={<BarChartOutlined />}
                            formatter={(value) => formatNumber(Number(value))}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={8}>
                    <Card>
                        <Statistic
                            title="Providers"
                            value={filteredUsageByProvider.length}
                            prefix={<ApiOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={12}>
                    <Card title="Model Usage Distribution">
                        {filteredModelStats.length > 0 && (
                            <Pie
                                key={`model-pie-${chartKey}`}
                                data={filteredModelStats}
                                height={300}
                                angleField="totalUsage"
                                colorField="modelName"
                                radius={0.8}
                                label={false}
                                interactions={[{ type: 'element-active' }]}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={12}>
                    <Card title="Token Usage by Provider">
                        {filteredUsageByProvider.length > 0 && (
                            <Column
                                key={`provider-column-${chartKey}`}
                                data={[
                                    ...filteredUsageByProvider.map(item => ({
                                        provider: item.provider,
                                        type: 'Input Tokens',
                                        tokens: item.inputTokens
                                    })),
                                    ...filteredUsageByProvider.map(item => ({
                                        provider: item.provider,
                                        type: 'Output Tokens',
                                        tokens: item.outputTokens
                                    }))
                                ]}
                                height={300}
                                xField="provider"
                                yField="tokens"
                                seriesField="type"
                                isStack={true}
                                yAxis={{
                                    tickFormatter: (value: number) => formatNumber(value)
                                }}
                                label={{
                                    text: (datum: any) => formatNumber(datum.tokens),
                                }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Tables */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24}>
                    <Card title="Model Usage Statistics">
                        <Table
                            dataSource={filteredModelStats}
                            columns={modelStatsColumns}
                            pagination={{ pageSize: 10 }}
                            size="small"
                            rowKey="modelName"
                            scroll={{ x: true }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24}>
                    <Card title="Usage by Provider">
                        <Table
                            dataSource={filteredUsageByProvider}
                            columns={providerUsageColumns}
                            pagination={false}
                            size="small"
                            rowKey="provider"
                            scroll={{ x: true }}
                        />
                    </Card>
                </Col>
            </Row>
        </>
    );
}
