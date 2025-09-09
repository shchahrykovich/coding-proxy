"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import AppLayout from "@/components/AppLayout";
import SessionsTable, {Session} from "@/components/SessionsTable";
import {
    Card,
    Typography,
    Spin,
    message
} from "antd";
import {
    DatabaseOutlined
} from "@ant-design/icons";

const {Text} = Typography;


interface SessionsResponse {
    sessions: Session[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function SessionsPage() {
    const [data, setData] = useState<SessionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const router = useRouter();

    useEffect(() => {
        fetchSessions(currentPage, pageSize);
    }, [currentPage, pageSize]);

    const fetchSessions = async (page: number, limit: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/sessions?page=${page}&limit=${limit}`);
            if (response.ok) {
                const responseData: SessionsResponse = await response.json();
                setData(responseData);
            } else {
                message.error('Failed to fetch sessions');
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
            message.error('Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (record: Session) => {
        router.push(`/sessions/${record.id}`);
    };

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };


    if (loading && !data) {
        return (
            <AppLayout>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    height: '50vh'
                }}>
                    <Spin size="large"/>
                    <Text style={{marginTop: '16px'}}>Loading sessions...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Sessions" icon={<DatabaseOutlined/>}>

            <Card>
                <SessionsTable
                    sessions={data?.sessions || []}
                    loading={loading}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={data?.pagination.total || 0}
                    onRowClick={handleRowClick}
                    onTableChange={handleTableChange}
                />
            </Card>
        </AppLayout>
    );
}
