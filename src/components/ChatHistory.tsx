"use client";

import { useState, useEffect, useRef } from "react";
import {
    Card,
    Typography,
    Space,
    Switch,
    Button,
    Image
} from "antd";
import {
    UserOutlined,
    RobotOutlined,
    ToolOutlined,
    DownOutlined,
    UpOutlined,
    LeftOutlined,
    RightOutlined
} from "@ant-design/icons";
import ChatTimeline from "./ChatTimeline";

const { Text } = Typography;

interface Message {
    role: string;
    content: any;
    timestamp?: string;
    [key: string]: any;
}

interface ChatData {
    messages?: Message[];
    [key: string]: any;
}

interface ChatHistoryProps {
    chatData: ChatData | null;
}

export default function ChatHistory({ chatData }: ChatHistoryProps) {
    const [rawViewEnabled, setRawViewEnabled] = useState<{ [key: number]: boolean }>({});
    const [expandedMessages, setExpandedMessages] = useState<{ [key: number]: boolean }>({});
    const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
    const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const toggleRawView = (messageIndex: number) => {
        setRawViewEnabled(prev => ({
            ...prev,
            [messageIndex]: !prev[messageIndex]
        }));
    };

    const toggleExpandMessage = (messageIndex: number) => {
        setExpandedMessages(prev => ({
            ...prev,
            [messageIndex]: !prev[messageIndex]
        }));
    };

    const scrollToMessage = (index: number) => {
        const messageElement = messageRefs.current[index];
        if (messageElement) {
            messageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            setCurrentMessageIndex(index);
        }
    };

    const goToPreviousMessage = () => {
        if (currentMessageIndex > 0) {
            scrollToMessage(currentMessageIndex - 1);
        }
    };

    const goToNextMessage = () => {
        const messageCount = chatData?.messages?.length || 0;
        if (currentMessageIndex < messageCount - 1) {
            scrollToMessage(currentMessageIndex + 1);
        }
    };

    // Update current message index based on scroll position
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const messageIndex = Object.keys(messageRefs.current).find(
                        key => messageRefs.current[parseInt(key)] === entry.target
                    );
                    if (messageIndex !== undefined) {
                        setCurrentMessageIndex(parseInt(messageIndex));
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all message elements
        Object.values(messageRefs.current).forEach((element) => {
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [chatData?.messages]);

    const formatMessageContent = (content: any) => {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            const textParts: string[] = [];
            const imageParts: any[] = [];

            content.forEach((item, idx) => {
                if (item.type === 'text') {
                    // Check if this is a new topic message
                    try {
                        const parsed = JSON.parse(item.text);
                        if (parsed.isNewTopic && parsed.title) {
                            textParts.push(`New topic: ${parsed.title}`);
                        } else {
                            textParts.push(item.text);
                        }
                    } catch {
                        // Not JSON, treat as regular text
                        textParts.push(item.text);
                    }
                } else if (item.type === 'image') {
                    imageParts.push(item);
                } else if (item.type === 'tool_use') {
                    if (item.name === 'TodoWrite' && item.input?.todos) {
                        // Format TodoWrite specially
                        const todos = item.input.todos;
                        const todoCount = todos.length;
                        const completedCount = todos.filter((t: any) => t.status === 'completed').length;
                        const inProgressCount = todos.filter((t: any) => t.status === 'in_progress').length;
                        const pendingCount = todos.filter((t: any) => t.status === 'pending').length;

                        let result = `📝 Todo Update (${todoCount} total, ${completedCount} completed, ${inProgressCount} in progress, ${pendingCount} pending)\n\n`;

                        // Group todos by status
                        const completedTodos = todos.filter((t: any) => t.status === 'completed');
                        const inProgressTodos = todos.filter((t: any) => t.status === 'in_progress');
                        const pendingTodos = todos.filter((t: any) => t.status === 'pending');

                        if (completedTodos.length > 0) {
                            result += `✅ Completed (${completedTodos.length}):\n`;
                            completedTodos.forEach((todo: any) => {
                                result += `  • ${todo.content}\n`;
                            });
                            result += '\n';
                        }

                        if (inProgressTodos.length > 0) {
                            result += `🔄 In Progress (${inProgressTodos.length}):\n`;
                            inProgressTodos.forEach((todo: any) => {
                                result += `  • ${todo.content}\n`;
                            });
                            result += '\n';
                        }

                        if (pendingTodos.length > 0) {
                            result += `⏳ Pending (${pendingTodos.length}):\n`;
                            pendingTodos.forEach((todo: any) => {
                                result += `  • ${todo.content}\n`;
                            });
                        }

                        textParts.push(result.trim());
                    } else {
                        textParts.push(`🔧 Tool: ${item.name}\nInput: ${JSON.stringify(item.input, null, 2)}`);
                    }
                } else if (item.type === 'tool_result') {
                    textParts.push(`📋 Tool Result (${item.tool_use_id}):\n${item.content || 'No content'}`);
                } else {
                    textParts.push(JSON.stringify(item, null, 2));
                }
            });

            // Return object containing both text and images for special handling
            return {
                text: textParts.join('\n\n'),
                images: imageParts
            };
        }

        return JSON.stringify(content, null, 2);
    };

    const getRawContent = (content: any) => {
        if (typeof content === 'string') {
            return content;
        }
        return JSON.stringify(content, null, 2);
    };

    const truncateContent = (content: string, maxLines: number = 10) => {
        const lines = content.split('\n');
        if (lines.length <= maxLines) {
            return { truncated: content, hasMore: false, totalLines: lines.length };
        }
        return {
            truncated: lines.slice(0, maxLines).join('\n') + '\n...',
            hasMore: true,
            totalLines: lines.length
        };
    };

    return (
        <>
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    backgroundColor: '#fff',
                    padding: '16px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    fontWeight: 600,
                    fontSize: '16px',
                    border: '1px solid #f0f0f0',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    marginBottom: '-1px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <span>Chat History</span>
                {chatData && chatData.messages && chatData.messages.length > 0 && (
                    <>
                        <ChatTimeline
                            messages={chatData.messages}
                            currentMessageIndex={currentMessageIndex}
                            onMessageClick={scrollToMessage}
                        />
                        <Space>
                            <Text type="secondary" style={{ fontSize: '14px' }}>
                                {currentMessageIndex + 1} / {chatData.messages.length}
                            </Text>
                            <Button
                                size="small"
                                type="text"
                                icon={<LeftOutlined />}
                                onClick={goToPreviousMessage}
                                disabled={currentMessageIndex === 0}
                            />
                            <Button
                                size="small"
                                type="text"
                                icon={<RightOutlined />}
                                onClick={goToNextMessage}
                                disabled={currentMessageIndex === (chatData.messages.length - 1)}
                            />
                        </Space>
                    </>
                )}
            </div>
            <Card
                variant={"borderless"}
                styles={{
                    body: {
                        padding: '0 24px 24px 24px',
                        border: '1px solid #f0f0f0',
                        borderTop: 'none',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        margin: 0
                    }
                }}
            >
            {chatData && chatData.messages && chatData.messages.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                    {chatData.messages.map((message, index) => {
                        // Check if it's a tool result by type field or content containing tool_result
                        const isToolResult = message.content[0]?.type === 'tool_result' ||
                                            (typeof message.content === 'string' && message.content.includes('"type": "tool_result"')) ||
                                            (message.content && typeof message.content === 'object' && message.content.type === 'tool_result');
                        const isUser = message.role === 'user' && !isToolResult;

                        // Check if raw and formatted views would be different
                        const formattedContent = formatMessageContent(message.content);
                        const rawContent = getRawContent(message.content);

                        // Handle mixed content (text + images)
                        const hasMixedContent = formattedContent && typeof formattedContent === 'object' && formattedContent.text !== undefined;
                        const hasRawViewDifference = hasMixedContent ?
                            formattedContent.text !== rawContent :
                            formattedContent !== rawContent;

                        // Get the content to display based on raw view toggle
                        let displayContent;
                        let imageContent = null;

                        if (rawViewEnabled[index]) {
                            displayContent = rawContent;
                        } else if (hasMixedContent) {
                            displayContent = formattedContent.text;
                            imageContent = formattedContent.images;
                        } else {
                            displayContent = formattedContent;
                        }

                        const contentInfo = truncateContent(displayContent as string);
                        const isExpanded = expandedMessages[index] || false;

                        const cardType: 'default' | 'inner' = 'inner';
                        let icon = <RobotOutlined />;
                        let title = 'Assistant';

                        if (isToolResult) {
                            icon = <ToolOutlined />;
                            title = 'Tool Execution';
                        } else if (isUser) {
                            icon = <UserOutlined />;
                            title = 'User';
                        }

                        title = (index + 1) + ': ' + title;

                        return (
                            <div
                                key={index}
                                ref={(el) => {
                                    messageRefs.current[index] = el;
                                }}
                            >
                                <Card
                                    type={cardType}
                                    size="small"
                                    style={{ marginBottom: '12px' }}
                                title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space>
                                            {icon}
                                            {title}
                                            {contentInfo.hasMore && (
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpandMessage(index);
                                                    }}
                                                    style={{ fontSize: '12px', padding: '0 4px' }}
                                                >
                                                    {isExpanded ? 'Hide' : `Show all (${contentInfo.totalLines} lines)`}
                                                </Button>
                                            )}
                                            {message.timestamp && (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {new Date(message.timestamp).toLocaleString()}
                                                </Text>
                                            )}
                                        </Space>
                                        {hasRawViewDifference && (
                                            <Space>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>Raw</Text>
                                                <Switch
                                                    size="small"
                                                    checked={rawViewEnabled[index] || false}
                                                    onChange={() => toggleRawView(index)}
                                                />
                                            </Space>
                                        )}
                                    </div>
                                }
                            >
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                    {isExpanded || !contentInfo.hasMore
                                        ? displayContent
                                        : contentInfo.truncated
                                    }
                                </div>

                                {/* Render image previews if present */}
                                {imageContent && imageContent.length > 0 && (
                                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {imageContent.map((imageItem: any, imgIndex: number) => {
                                            if (imageItem.source && imageItem.source.type === 'base64') {
                                                const imageUrl = `data:${imageItem.source.media_type};base64,${imageItem.source.data}`;
                                                return (
                                                    <div key={imgIndex} style={{ position: 'relative' }}>
                                                        <Image
                                                            src={imageUrl}
                                                            alt={`Image ${imgIndex + 1}`}
                                                            width={120}
                                                            height={120}
                                                            style={{
                                                                objectFit: 'contain',
                                                                border: '1px solid #d9d9d9',
                                                                borderRadius: '4px'
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: '2px',
                                                                right: '2px',
                                                                backgroundColor: 'rgba(0,0,0,0.6)',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                padding: '2px 4px',
                                                                borderRadius: '2px'
                                                            }}
                                                        >
                                                            #{imgIndex + 1}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}
                            </Card>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '24px' }}>
                    {chatData ? 'No messages found in this session.' : 'Chat data not available.'}
                </div>
            )}
            </Card>
        </>
    );
}
