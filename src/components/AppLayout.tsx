"use client";

import React, { useState } from "react";
import {
    Layout,
    Typography,
} from "antd";
import Link from "next/link";
import AppMenu from "./AppMenu";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
}

export default function AppLayout({ children, title, icon }: AppLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                theme="light"
                style={{
                    boxShadow: '2px 0 6px rgba(0,21,41,.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 100
                }}
                width={250}
                collapsedWidth={80}
            >
                {/* Header */}
                <div style={{
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    padding: '0 16px',
                    flexShrink: 0
                }}>
                    <Link href="/">
                        <img src={'/coding-proxy-logo.png'} alt="Logo" style={{ height: '32px', width: '32px' }} />
                    </Link>
                    {!collapsed && (
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <Text strong style={{ marginLeft: '12px', fontSize: '16px' }}>
                                Codding Proxy
                            </Text>
                        </Link>

                    )}
                </div>

                <AppMenu collapsed={collapsed} />
            </Sider>

            <Layout style={{ marginLeft: collapsed ? 80 : 250 }}>
                <Content style={{
                    padding: '24px',
                    backgroundColor: '#f5f5f5',
                    overflow: 'auto',
                    height: '100vh'
                }}>
                    {title && (
                        <Title level={3} style={{ marginBottom: '24px' }}>
                            {icon && React.cloneElement(icon as React.ReactElement, {
                                ...{style: { marginRight: '12px', color: '#1890ff' }}
                            })}
                            {title}
                        </Title>
                    )}
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
