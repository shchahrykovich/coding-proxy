"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Typography, Card, Row, Col, Spin } from "antd";
import { HomeOutlined, BarChartOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import _ from "lodash";

const Line = dynamic(() => import('@ant-design/plots').then(mod => ({ default: mod.Line })), {
    ssr: false,
    loading: () => <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
    </div>
});

const { Title, Text } = Typography;

interface Session {
    id: number;
    name: string;
    provider: string;
    contributorId: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    lastReceivedRequestAt: string;
    title: string;
    project: string;
    contributorName: string;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
}

interface DayData {
    date: string;
    count: number;
}

interface TokenData {
    date: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export default function Page() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<DayData[]>([]);
    const [tokenData, setTokenData] = useState<TokenData[]>([]);
    const router = useRouter();

    useEffect(() => {
        async function fetchSessions() {
            try {
                const response = await fetch('/api/dashboard');
                if (response.ok) {
                    const sessionsData: {
                        sessions: Session[]
                    } = await response.json();
                    setSessions(sessionsData.sessions);

                    // Process data for charts
                    const sessionsByDay: { [key: string]: number } = {};
                    const tokensByDay: { [key: string]: { input: number; output: number } } = {};

                    sessionsData.sessions.forEach(session => {
                        const date = new Date(session.lastReceivedRequestAt).toISOString().split('T')[0];
                        sessionsByDay[date] = (sessionsByDay[date] || 0) + 1;

                        if (!tokensByDay[date]) {
                            tokensByDay[date] = { input: 0, output: 0 };
                        }
                        tokensByDay[date].input += session.totalInputTokens;
                        tokensByDay[date].output += session.totalOutputTokens;
                    });

                    // Convert to chart data and sort by date
                    const chartData = Object.entries(sessionsByDay)
                        .map(([date, count]) => ({ date, count }))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(-30); // Last 30 days

                    const tokenChartData = Object.entries(tokensByDay)
                        .map(([date, tokens]) => ({
                            date,
                            inputTokens: tokens.input,
                            outputTokens: tokens.output,
                            totalTokens: tokens.input + tokens.output
                        }))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(-30); // Last 30 days

                    setChartData(chartData);
                    setTokenData(tokenChartData);
                } else {
                    console.error('Failed to fetch sessions');
                }
            } catch (error) {
                console.error('Error fetching sessions:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSessions();
    }, []);

    const handleSessionClick = (sessionId: number) => {
        router.push(`/sessions/${sessionId}`);
    };

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
                    <Text style={{ marginTop: '16px' }}>Loading dashboard...</Text>
                </div>
            </AppLayout>
        );
    }

    const lineConfig = {
        data: chartData,
        xField: 'date',
        yField: 'count',
        height: 300,
        smooth: true,
        point: {
            size: 5,
            shape: 'diamond',
        },
        tooltip: {
            title: (title: string, datum: any) => {
                return title;
            },
            formatter: (datum: any) => ({
                name: 'Sessions',
                value: datum.count
            })
        },
        xAxis: {
            type: 'time',
            tickCount: 5,
        },
        yAxis: {
            label: {
                formatter: (v: string) => `${v} sessions`,
            },
        },
    };

    const tokenLineConfig = {
        data: tokenData,
        xField: 'date',
        yField: 'totalTokens',
        height: 300,
        smooth: true,
        point: {
            size: 5,
            shape: 'diamond',
        },
        tooltip: {
            title: (title: string, datum: any) => {
                return title;
            },
            formatter: (datum: any) => ({
                name: 'Total Tokens',
                value: datum.totalTokens.toLocaleString()
            })
        },
        xAxis: {
            type: 'time',
            tickCount: 5,
        },
        yAxis: {
            label: {
                formatter: (v: string) => `${parseInt(v).toLocaleString()} tokens`,
            },
        },
    };

    return (
        <AppLayout title="Dashboard" icon={<HomeOutlined />}>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card title="Quick Stats">
                        <Row gutter={[32, 0]} style={{ textAlign: 'center' }}>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                                    {sessions.length}
                                </Title>
                                <Text type="secondary">Total Sessions</Text>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                                    {_.uniqBy(sessions, s => s.provider).length.toLocaleString()}
                                </Title>
                                <Text type="secondary">Total Providers</Text>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                                    {_.uniqBy(sessions, s => s.contributorId).length.toLocaleString()}
                                </Title>
                                <Text type="secondary">Total Contributors</Text>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                                    {new Set(sessions.filter(s => s.project).map(s => s.project)).size}
                                </Title>
                                <Text type="secondary">Projects</Text>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#722ed1' }}>
                                    {chartData.length > 0 ? Math.round(chartData.reduce((sum, day) => sum + day.count, 0) / chartData.length * 10) / 10 : 0}
                                </Title>
                                <Text type="secondary">Avg Sessions/Day</Text>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Title level={2} style={{ margin: 0, color: '#fa8c16' }}>
                                    {sessions.reduce((sum, session) => sum + session.totalInputTokens + session.totalOutputTokens, 0).toLocaleString()}
                                </Title>
                                <Text type="secondary">Total Tokens</Text>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <div>
                                <BarChartOutlined style={{ marginRight: '8px' }} />
                                Sessions Activity (Last 30 Days)
                            </div>
                        }
                        style={{ marginBottom: '24px' }}
                    >
                        {chartData.length > 0 ? (
                            <Line {...lineConfig} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '50px 0' }}>
                                <Text type="secondary">No session data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <div>
                                <BarChartOutlined style={{ marginRight: '8px' }} />
                                Token Usage (Last 30 Days)
                            </div>
                        }
                        style={{ marginBottom: '24px' }}
                    >
                        {tokenData.length > 0 ? (
                            <Line {...tokenLineConfig} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '50px 0' }}>
                                <Text type="secondary">No token data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col span={24}>
                    <Card title="Latest Sessions">
                        {sessions.slice(0, 5).map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleSessionClick(session.id)}
                                style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f0f0f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <div>
                                    <Text strong style={{ color: '#1890ff' }}>
                                        {session.project || 'N/A'}: {session.title || session.name}
                                    </Text>
                                    <div style={{ marginTop: '4px' }}>
                                        <Text type="secondary" style={{ marginRight: '16px' }}>
                                            Provider: {session.provider}
                                        </Text>
                                        <Text type="secondary" style={{ marginRight: '16px' }}>
                                            Requests: {session.totalRequests}
                                        </Text>
                                        <Text type="secondary" style={{ marginRight: '16px' }}>
                                            Contributor: {session.contributorName}
                                        </Text>
                                    </div>
                                    <div style={{ marginTop: '4px' }}>
                                        <Text type="secondary" style={{ marginRight: '16px' }}>
                                            Input Tokens: {session.totalInputTokens.toLocaleString()}
                                        </Text>
                                        <Text type="secondary" style={{ marginRight: '16px' }}>
                                            Output Tokens: {session.totalOutputTokens.toLocaleString()}
                                        </Text>
                                        <Text type="secondary">
                                            Total: {(session.totalInputTokens + session.totalOutputTokens).toLocaleString()}
                                        </Text>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {new Date(session.lastReceivedRequestAt).toLocaleString()}
                                    </Text>
                                </div>
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '50px 0' }}>
                                <Text type="secondary">No sessions available</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </AppLayout>
    );
}
