"use client";

import React from 'react';
import { Tooltip } from 'antd';

interface Message {
    role: string;
    content: any;
    timestamp?: string;
    [key: string]: any;
}

interface ChatTimelineProps {
    messages: Message[];
    currentMessageIndex: number;
    onMessageClick: (index: number) => void;
}

interface TimelineItem {
    index: number;
    type: 'user' | 'tool_edit' | 'other';
    title: string;
    timestamp?: string;
}

export default function ChatTimeline({ messages, currentMessageIndex, onMessageClick }: ChatTimelineProps) {
    // Parse message content to extract readable text
    const parseMessageContent = (content: any): string => {
        if (typeof content === 'string') {
            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    return parseMessageContent(parsed);
                }
            } catch (e) {
                // Not JSON, return as is
                return content.trim();
            }
        }
        
        if (Array.isArray(content)) {
            for (const item of content) {
                if (item.type === 'text' && item.text) {
                    return item.text.trim();
                }
                if (item.type === 'tool_use' && item.name === 'TodoWrite' && item.input?.todos) {
                    // Extract actual todo items for display
                    const todos = item.input.todos;
                    const todoList = todos.map((todo: any) => {
                        const statusEmoji = todo.status === 'completed' ? '✅' : 
                                           todo.status === 'in_progress' ? '🔄' : 
                                           todo.status === 'pending' ? '⏳' : '❓';
                        return `${statusEmoji} ${todo.content}`;
                    }).join(' ');
                    
                    const todoCount = todos.length;
                    const completedCount = todos.filter((t: any) => t.status === 'completed').length;
                    const inProgressCount = todos.filter((t: any) => t.status === 'in_progress').length;
                    
                    return `Todo Update (${todoCount} total, ${completedCount} completed, ${inProgressCount} in progress): ${todoList}`;
                }
            }
        }
        
        return 'Message content';
    };

    // Extract important messages (first user message and TodoWrite updates)
    const getImportantMessages = (): TimelineItem[] => {
        const importantMessages: TimelineItem[] = [];
        let firstUserFound = false;
        
        messages.forEach((message, index) => {
            const isToolResult = message.content[0]?.type === 'tool_result' ||
                               (typeof message.content === 'string' && message.content.includes('"type": "tool_result"')) ||
                               (message.content && typeof message.content === 'object' && message.content.type === 'tool_result');
            
            const isUser = message.role === 'user' && !isToolResult;
            
            // Handle assistant messages - only capture TodoWrite tool calls
            if (message.role === 'assistant') {
                let isTodoWrite = false;
                
                // Check different possible content structures
                if (Array.isArray(message.content)) {
                    isTodoWrite = message.content.some(item => 
                        item.type === 'tool_use' && 
                        item.name === 'TodoWrite'
                    );
                } else if (typeof message.content === 'string') {
                    // Check if it's a stringified JSON containing TodoWrite
                    try {
                        const parsed = JSON.parse(message.content);
                        if (Array.isArray(parsed)) {
                            isTodoWrite = parsed.some(item => 
                                item.type === 'tool_use' && 
                                item.name === 'TodoWrite'
                            );
                        }
                    } catch (e) {
                        // Not JSON, check for TodoWrite in string
                        isTodoWrite = message.content.includes('TodoWrite');
                    }
                }
                
                if (isTodoWrite) {
                    const parsedContent = parseMessageContent(message.content);
                    importantMessages.push({
                        index,
                        type: 'tool_edit',
                        title: parsedContent,
                        timestamp: message.timestamp
                    });
                }
                // Skip all other assistant messages
                return;
            }
            
            // Only include first user message
            if (isUser && !firstUserFound) {
                const parsedContent = parseMessageContent(message.content);
                importantMessages.push({
                    index,
                    type: 'user',
                    title: parsedContent.length > 50 ? parsedContent.substring(0, 50) + '...' : parsedContent,
                    timestamp: message.timestamp
                });
                firstUserFound = true;
            }
        });
        
        // If too many TodoWrite messages (more than 7), reduce them by keeping key ones
        // Always keep the first user message
        const userMessages = importantMessages.filter(m => m.type === 'user');
        const todoMessages = importantMessages.filter(m => m.type === 'tool_edit');
        
        if (todoMessages.length > 7) {
            const reduced: TimelineItem[] = [];
            const step = Math.ceil(todoMessages.length / 7);
            
            for (let i = 0; i < todoMessages.length; i += step) {
                reduced.push(todoMessages[i]);
            }
            
            // Always include the last TodoWrite if not already included
            const lastTodo = todoMessages[todoMessages.length - 1];
            if (reduced[reduced.length - 1].index !== lastTodo.index) {
                reduced.push(lastTodo);
            }
            
            return [...userMessages, ...reduced.slice(0, 7)];
        }
        
        return importantMessages;
    };

    const importantMessages = getImportantMessages();
    
    if (importantMessages.length === 0) {
        return null;
    }

    const getDotColor = (type: string) => {
        switch (type) {
            case 'user':
                return '#1890ff';  // Blue for first user message
            case 'tool_edit':
                return '#52c41a';  // Green for TodoWrite updates
            default:
                return '#faad14';
        }
    };

    const getTooltipTitle = (item: TimelineItem) => {
        let title = item.title;
        if (item.timestamp) {
            title += `\n${new Date(item.timestamp).toLocaleString()}`;
        }
        return title;
    };

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                marginLeft: '24px',
                marginRight: '24px'
            }}
        >
            {/* Timeline line */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#e8e8e8',
                    zIndex: 1,
                    transform: 'translateY(-50%)'
                }}
            />
            
            {/* Progress line showing current position */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    height: '2px',
                    backgroundColor: '#1890ff',
                    zIndex: 2,
                    transform: 'translateY(-50%)',
                    width: `${((currentMessageIndex + 1) / messages.length) * 100}%`,
                    transition: 'width 0.3s ease'
                }}
            />

            {/* Timeline dots positioned by actual message index */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '12px',
                    zIndex: 3
                }}
            >
                {importantMessages.map((item, timelineIndex) => {
                    const isActive = item.index === currentMessageIndex;
                    const isPassed = item.index <= currentMessageIndex;
                    const dotColor = getDotColor(item.type);
                    const positionPercent = ((item.index + 1) / messages.length) * 100;
                    
                    return (
                        <Tooltip
                            key={`${item.index}-${timelineIndex}`}
                            title={getTooltipTitle(item)}
                            placement="bottom"
                        >
                            <div
                                onClick={() => onMessageClick(item.index)}
                                style={{
                                    position: 'absolute',
                                    left: `${positionPercent}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#1890ff' : isPassed ? dotColor : '#fff',
                                    border: `2px solid ${isActive ? '#1890ff' : isPassed ? dotColor : '#d9d9d9'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: `translate(-50%, -50%) ${isActive ? 'scale(1.3)' : 'scale(1)'}`,
                                    boxShadow: isActive ? '0 2px 8px rgba(24, 144, 255, 0.3)' : 'none'
                                }}
                            />
                        </Tooltip>
                    );
                })}
            </div>
            
            {/* Current position indicator (for non-important messages) */}
            {!importantMessages.some(item => item.index === currentMessageIndex) && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${((currentMessageIndex + 1) / messages.length) * 100}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#1890ff',
                        border: '1px solid #fff',
                        zIndex: 4,
                        transition: 'left 0.3s ease'
                    }}
                />
            )}
        </div>
    );
}