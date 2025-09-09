"use client";

import React, {useState, useEffect} from 'react';
import {
    Select,
    Space,
    Typography,
    Spin,
    Alert,
    Tabs
} from 'antd';
import {
    BarChartOutlined,
    TeamOutlined,
    BulbOutlined,
    RobotOutlined
} from '@ant-design/icons';
import AppLayout from '@/components/AppLayout';
import OverviewTab from '@/components/analytics/OverviewTab';
import ContributorTab from '@/components/analytics/ContributorTab';
import WorkTypeTab from '@/components/analytics/WorkTypeTab';
import ModelUsageTab from '@/components/analytics/ModelUsageTab';
import type {AnalyticsResponse, GetAnalyticsQuery} from '../api/analytics/dtos';

const {Text} = Typography;
const {Option} = Select;


interface ContributorAnalyticsResponse {
    contributors: any[];
    summary: {
        totalContributors: number;
        totalActiveContributors: number;
        totalSessions: number;
        totalRequests: number;
        totalTokens: number;
    };
}

interface AnalyticsPageState {
    data: AnalyticsResponse | null;
    contributorData: ContributorAnalyticsResponse | null;
    loading: boolean;
    contributorLoading: boolean;
    error: string | null;
    contributorError: string | null;
    filters: {
        dateRange: string;
        proxyId?: string;
    };
    activeTab: string;
}

export default function AnalyticsPage() {
    const [mounted, setMounted] = useState(false);
    const [chartKey, setChartKey] = useState(0);
    const [state, setState] = useState<AnalyticsPageState>({
        data: null,
        contributorData: null,
        loading: true,
        contributorLoading: false,
        error: null,
        contributorError: null,
        filters: {
            dateRange: '30d'
        },
        activeTab: 'overview'
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchAnalytics = async (filters: GetAnalyticsQuery) => {
        setState(prev => ({...prev, loading: true, error: null}));

        try {
            const params = new URLSearchParams();
            if (filters.dateRange) params.append('dateRange', filters.dateRange);
            if (filters.proxyId) params.append('proxyId', filters.proxyId);

            const response = await fetch(`/api/analytics?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch analytics: ${response.statusText}`);
            }

            const data: AnalyticsResponse = await response.json();
            setState(prev => ({...prev, data, loading: false}));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to fetch analytics',
                loading: false
            }));
        }
    };

    const fetchContributorAnalytics = async (filters: { dateRange: string }) => {
        setState(prev => ({...prev, contributorLoading: true, contributorError: null}));

        try {
            const params = new URLSearchParams();
            if (filters.dateRange) params.append('dateRange', filters.dateRange);

            const response = await fetch(`/api/contributors-analytics?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch contributor analytics: ${response.statusText}`);
            }

            const contributorData: ContributorAnalyticsResponse = await response.json();
            setState(prev => ({...prev, contributorData, contributorLoading: false}));
        } catch (error) {
            setState(prev => ({
                ...prev,
                contributorError: error instanceof Error ? error.message : 'Failed to fetch contributor analytics',
                contributorLoading: false
            }));
        }
    };

    useEffect(() => {
        if (mounted) {
            fetchAnalytics(state.filters as GetAnalyticsQuery);
            if (state.activeTab === 'contributors') {
                fetchContributorAnalytics({dateRange: state.filters.dateRange});
            }
        }
    }, [mounted, state.filters]);

    useEffect(() => {
        if (mounted && state.activeTab === 'contributors' && !state.contributorData) {
            fetchContributorAnalytics({dateRange: state.filters.dateRange});
        }
    }, [mounted, state.activeTab]);

    const handleFilterChange = (key: keyof GetAnalyticsQuery, value: string | undefined) => {
        const newFilters = {...state.filters, [key]: value};
        setState(prev => ({...prev, filters: newFilters}));
    };

    const handleTabChange = (key: string) => {
        setState(prev => ({...prev, activeTab: key}));
        // Force chart re-render when switching tabs
        setTimeout(() => {
            setChartKey(prev => prev + 1);
        }, 100);
    };

    const formatNumber = (num: number) => {
        if (num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        } else {
            return '0';
        }
    };

    if (!mounted || state.loading) {
        return (
            <AppLayout title="Analytics" icon={<BarChartOutlined/>}>
                <div style={{textAlign: 'center', padding: '50px 0'}}>
                    <Spin size="large"/>
                </div>
            </AppLayout>
        );
    }

    if (state.error) {
        return (
            <AppLayout title="Analytics" icon={<BarChartOutlined/>}>
                <Alert
                    message="Error Loading Analytics"
                    description={state.error}
                    type="error"
                    showIcon
                />
            </AppLayout>
        );
    }

    if (!state.data) {
        return (
            <AppLayout title="Analytics" icon={<BarChartOutlined/>}>
                <Alert
                    message="No Data Available"
                    description="No analytics data found"
                    type="info"
                    showIcon
                />
            </AppLayout>
        );
    }

    const {data, contributorData} = state;


    return (
        <AppLayout title="Analytics" icon={<BarChartOutlined/>}>
            <div style={{marginBottom: '24px'}}>
                <Space>
                    <Text strong>Date Range:</Text>
                    <Select
                        value={state.filters.dateRange}
                        onChange={(value) => handleFilterChange('dateRange', value)}
                        style={{width: 120}}
                    >
                        <Option value="7d">Last 7 days</Option>
                        <Option value="30d">Last 30 days</Option>
                        <Option value="90d">Last 90 days</Option>
                        <Option value="1y">Last year</Option>
                    </Select>
                </Space>
            </div>

            <Tabs
                activeKey={state.activeTab}
                onChange={handleTabChange}
                items={[
                    {
                        key: 'overview',
                        label: (
                            <span>
                <BarChartOutlined/>&nbsp;
                Overview
              </span>
                        ),
                        children: data ?
                            <OverviewTab data={data} formatNumber={formatNumber} chartKey={chartKey}/> : null,
                    },
                    {
                        key: 'contributors',
                        label: (
                            <span>
                <TeamOutlined/>&nbsp;
                Contributors
              </span>
                        ),
                        children: <ContributorTab
                            contributorData={contributorData}
                            contributorLoading={state.contributorLoading}
                            contributorError={state.contributorError}
                            formatNumber={formatNumber}
                            chartKey={chartKey}
                        />,
                    },
                    {
                        key: 'work-types',
                        label: (
                            <span>
                <BulbOutlined/>&nbsp;
                Work Type
              </span>
                        ),
                        children: data ?
                            <WorkTypeTab data={data} formatNumber={formatNumber} chartKey={chartKey}/> : null,
                    },
                    {
                        key: 'model-usage',
                        label: (
                            <span>
                <RobotOutlined/>&nbsp;
                Model Usage
              </span>
                        ),
                        children: data ?
                            <ModelUsageTab data={data} formatNumber={formatNumber} chartKey={chartKey}/> : null,
                    },
                ]}
            />
        </AppLayout>
    );
}
