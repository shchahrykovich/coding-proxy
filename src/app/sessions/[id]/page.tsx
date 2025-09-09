"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ChatHistory from "@/components/ChatHistory";
import { WorkSessionAnalytics } from "@/analytics/schemas";
import ReactMarkdown from "react-markdown";
import {
    Button,
    Card,
    Typography,
    Space,
    Spin,
    Tag,
    Descriptions,
    Row,
    Col,
    Alert,
    Timeline,
    Statistic,
    Divider,
    message,
    Collapse
} from "antd";
import {
    ReloadOutlined,
    ToolOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

interface SessionDetail {
    id: number;
    name: string;
    provider: string;
    contributorId: string;
    accountId: string;
    analytics: WorkSessionAnalytics;
    requestCount: number;
    createdAt: string;
    updatedAt: string;
}

interface ChatData {
    messages?: any[];
    [key: string]: any;
}

export default function SessionDetailPage() {
    const params = useParams();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionDetail | null>(null);
    const [chatData, setChatData] = useState<ChatData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFullSpecification, setShowFullSpecification] = useState(false);
    const [showFullQAChecklist, setShowFullQAChecklist] = useState(false);
    const [showFullSummary, setShowFullSummary] = useState(false);
    const [showFullImprovements, setShowFullImprovements] = useState(false);
    const [showFullMemoryRecords, setShowFullMemoryRecords] = useState<Record<number, boolean>>({});
    const [showFullTopicImplementations, setShowFullTopicImplementations] = useState<Record<string, boolean>>({});

    useEffect(() => {
        async function fetchSessionData() {
            try {
                // Fetch session details
                const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
                if (!sessionResponse.ok) {
                    throw new Error('Failed to fetch session details');
                }
                const sessionData: SessionDetail = await sessionResponse.json();
                setSession(sessionData);

                // Fetch chat messages
                const messagesResponse = await fetch(`/api/sessions/${sessionId}/messages`);
                if (messagesResponse.ok) {
                    const messages: ChatData = await messagesResponse.json();
                    setChatData(messages);
                } else {
                    console.warn('Failed to fetch chat messages');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        if (sessionId) {
            fetchSessionData();
        }
    }, [sessionId]);

    const handleUpdate = async () => {
        setUpdating(true);
        setError(null);

        try {
            // Send PUT request to update session analytics
            const updateResponse = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update session');
            }

            const updatedSession: SessionDetail = await updateResponse.json();
            setSession(updatedSession);

            // Fetch chat messages
            const messagesResponse = await fetch(`/api/sessions/${sessionId}/messages`);
            if (messagesResponse.ok) {
                const messages: ChatData = await messagesResponse.json();
                setChatData(messages);
            } else {
                console.warn('Failed to fetch chat messages');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            message.error('Failed to update session');
        } finally {
            setUpdating(false);
        }
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
                    <Text style={{ marginTop: '16px' }}>Loading session details...</Text>
                </div>
            </AppLayout>
        );
    }

    if (error || !session) {
        return (
            <AppLayout>
                <Alert
                    message="Error Loading Session"
                    description={error || 'Session not found'}
                    type="error"
                    showIcon
                    style={{ marginBottom: '24px' }}
                />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Row>
                <Col span={20}>
                    <Title level={1}>{session.analytics?.title || session.name}</Title>
                </Col>
                <Col span={4}>
                    <Button
                        type="primary"
                        style={{ marginTop: '24px' }}
                        icon={<ReloadOutlined />}
                        onClick={handleUpdate}
                        loading={updating}
                    >
                        {updating ? 'Analyzing...' : 'Reanalyze Session'}
                    </Button>
                </Col>
            </Row>

            {/* Session Overview */}
            <Card title="Session Overview" style={{ marginBottom: '24px' }}>
                <Row gutter={[24, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Provider"
                            value={session.provider}
                            prefix={
                                <Tag color={
                                    session.provider === 'anthropic' ? 'purple' :
                                    session.provider === 'openai' ? 'green' : 'orange'
                                }>
                                    {session.provider}
                                </Tag>
                            }
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Total Requests"
                            value={session.requestCount}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Total Tools"
                            value={session.analytics?.totalTools || 0}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Avg user message length"
                            value={Math.round(session.analytics?.averageUserMessageLength || 0)}
                        />
                    </Col>
                </Row>

                <Divider />

                <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
                    <Descriptions.Item label="Type">
                        {session.analytics.type ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {session.analytics.type.split(';').map((type, index) => (
                                    <li key={index}>{type.trim()}</li>
                                ))}
                            </ul>
                        ) : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Projects">
                        {session.analytics?.projects?.length ? session.analytics.projects.join(', ') : 'None'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                        <Text>{new Date(session.createdAt).toLocaleString()}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Updated">
                        <Text>{new Date(session.updatedAt).toLocaleString()}</Text>
                    </Descriptions.Item>
                </Descriptions>

                {/* To-Do Items */}
                {session.analytics?.todos && Object.keys(session.analytics.todos).length > 0 && (
                    <>
                        <Divider orientation="left">To-Do Items</Divider>
                        <Collapse
                            style={{ marginBottom: '16px' }}
                            items={Object.entries(session.analytics.todos).map(([category, items]) => ({
                                key: category,
                                label: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Text strong>{category}</Text>
                                        <Tag color="blue">{(items as any[]).length} items</Tag>
                                        <Tag color="green">
                                            {Math.round((items as any[]).filter((item: any) => item.status === 'completed').length / (items as any[]).length * 100)}% completed
                                        </Tag>
                                    </div>
                                ),
                                children: (
                                    <Timeline
                                        items={(items as any[]).map((item: any) => ({
                                            dot: item.status === 'completed' ? '✅' :
                                                 item.status === 'in_progress' ? '🔄' : '⏳',
                                            children: (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Text
                                                        style={{
                                                            color: item.status === 'completed' ? '#666' : '#333',
                                                            flex: 1
                                                        }}
                                                    >
                                                        {item.content}
                                                    </Text>
                                                    <Tag
                                                        color={
                                                            item.status === 'completed' ? 'green' :
                                                            item.status === 'in_progress' ? 'orange' : 'default'
                                                        }
                                                    >
                                                        {item.status.replace('_', ' ')}
                                                    </Tag>
                                                </div>
                                            )
                                        }))}
                                    />
                                )
                            }))}
                        />
                    </>
                )}

                {/* Additional Session Data */}
                <Divider orientation="left">Memory</Divider>
                <Descriptions column={1} bordered size="small">

                    {/* Topic Implementations - each as separate item */}
                    {session.analytics.topicImplementations && Object.keys(session.analytics.topicImplementations).length > 0 ? (
                        Object.entries(session.analytics.topicImplementations).map(([topic, implementation]) => {
                            const isExpanded = showFullTopicImplementations[topic] || false;
                            const shouldTruncate = implementation.length > 300;

                            return (
                                <Descriptions.Item key={`topic-${topic}`} label={topic}>
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#f5f5f5',
                                        borderRadius: '6px',
                                        border: '1px solid #d9d9d9'
                                    }}>
                                        <div style={{
                                            maxHeight: isExpanded ? 'none' : '150px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <ReactMarkdown>{implementation}</ReactMarkdown>
                                            {!isExpanded && shouldTruncate && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '50px',
                                                    background: 'linear-gradient(transparent, #f5f5f5)',
                                                    pointerEvents: 'none'
                                                }} />
                                            )}
                                        </div>
                                        {shouldTruncate && (
                                            <Button
                                                type="link"
                                                size="small"
                                                style={{ padding: 0, marginTop: '8px' }}
                                                onClick={() => setShowFullTopicImplementations(prev => ({
                                                    ...prev,
                                                    [topic]: !isExpanded
                                                }))}
                                            >
                                                {isExpanded ? 'Show less' : 'Show more'}
                                            </Button>
                                        )}
                                    </div>
                                </Descriptions.Item>
                            );
                        })
                    ) : (
                        <Descriptions.Item label="Topic Implementations">
                            None
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            {/* Model Usage */}
            {session.analytics?.modelUsage && session.analytics.modelUsage.length > 0 && (
                <Card title="Model Usage" style={{ marginBottom: '24px' }}>
                    <Row gutter={[16, 16]}>
                        {session.analytics.modelUsage.map((modelUsage, index) => (
                            <Col xs={24} sm={12} lg={8} key={index}>
                                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                                    <Title level={5} style={{ marginBottom: '12px' }}>
                                        {modelUsage.model}
                                    </Title>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Statistic
                                                title="Input Tokens"
                                                value={modelUsage.inputTokens}
                                                valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <Statistic
                                                title="Output Tokens"
                                                value={modelUsage.outputTokens}
                                                valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                                            />
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}

            {/* Tool Usage */}
            {session.analytics?.toolUsage && session.analytics.toolUsage.length > 0 && (() => {
                // Group tools by name and sum their counts
                const groupedTools = session.analytics.toolUsage.reduce((acc, tool) => {
                    if (acc[tool.name]) {
                        acc[tool.name] += tool.count;
                    } else {
                        acc[tool.name] = tool.count;
                    }
                    return acc;
                }, {} as Record<string, number>);

                // Convert to array and sort by count (descending)
                const sortedTools = Object.entries(groupedTools)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                return (
                    <Card
                        title={
                            <Space>
                                <ToolOutlined />
                                Tool Usage
                            </Space>
                        }
                        style={{ marginBottom: '24px' }}
                    >
                        <Space size={[8, 8]} wrap>
                            {sortedTools.map((tool, index) => (
                                <Tag
                                    key={index}
                                    color="blue"
                                    style={{ fontSize: '14px', padding: '4px 8px' }}
                                >
                                    {tool.name}: {tool.count}
                                </Tag>
                            ))}
                        </Space>
                    </Card>
                );
            })()}

            {/* Chat Messages */}
            <ChatHistory chatData={chatData} />
        </AppLayout>
    );
}
