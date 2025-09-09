"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
    Button,
    Card,
    Table,
    Typography,
    Space,
    Spin,
    Empty,
    Modal,
    Form,
    Input,
    message
} from "antd";
import {
    SettingOutlined,
    EditOutlined
} from "@ant-design/icons";
import type { ColumnsType } from 'antd/es/table';
import {SettingTypes} from "@/entities/settings";

const { Title, Text } = Typography;

interface Setting {
    id: number;
    key: string;
    value: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState<string>("");
    const [editingValue, setEditingValue] = useState<string>("");
    const [editingType, setEditingType] = useState<string>("");
    const [updating, setUpdating] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/settings');

            if (response.ok) {
                const data: Setting[] = await response.json();
                setSettings(data);
            } else {
                message.error('Failed to fetch settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            message.error('Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (setting: Setting) => {
        setEditingKey(setting.key);
        setEditingValue(setting.value);
        form.setFieldsValue({
            key: setting.key,
            value: setting.value
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const values = await form.validateFields();
            setUpdating(true);

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: values.key,
                    value: values.value
                }),
            });

            if (response.ok) {
                const updatedSetting: any = await response.json();

                // Update the setting in the list
                setSettings(prev =>
                    prev.map(setting =>
                        setting.key === values.key
                            ? { ...setting, value: values.value, updatedAt: updatedSetting.updatedAt }
                            : setting
                    )
                );

                message.success('Setting updated successfully');
                setEditModalVisible(false);
                form.resetFields();
            } else {
                const error: any = await response.json();
                message.error(error.error || 'Failed to update setting');
            }
        } catch (error) {
            console.error('Error updating setting:', error);
            message.error('Failed to update setting');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        setEditModalVisible(false);
        form.resetFields();
        setEditingKey("");
        setEditingValue("");
    };

    const columns: ColumnsType<Setting> = [
        {
            title: 'Name',
            dataIndex: 'key',
            key: 'key',
            width: '30%',
            render: (key: string) => <Text strong>{key}</Text>
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            width: '40%',
            render: (value: string, record: Setting) => {
                if (record.type === SettingTypes.Hidden.toString()) {
                    return (
                        <Text code style={{ wordBreak: 'break-all' }}>
                            {'•'.repeat(Math.min(value.length || 8, 12))}
                        </Text>
                    );
                }
                return (
                    <Text code style={{ wordBreak: 'break-all' }}>
                        {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                    </Text>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            width: '20%',
            render: (_, setting: Setting) => (
                <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(setting)}
                    size="small"
                >
                    Edit
                </Button>
            )
        }
    ];

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
                    <Text style={{ marginTop: '16px' }}>Loading settings...</Text>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Settings" icon={<SettingOutlined />}>

            <Card>
                {settings.length > 0 ? (
                    <Table
                        dataSource={settings}
                        columns={columns}
                        rowKey="id"
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} of ${total} settings`,
                        }}
                    />
                ) : (
                    <Empty
                        description="No settings found"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </Card>

            <Modal
                title={
                    <Space>
                        <EditOutlined />
                        Edit Setting
                    </Space>
                }
                open={editModalVisible}
                onOk={handleUpdate}
                onCancel={handleCancel}
                confirmLoading={updating}
                okText="Update"
                cancelText="Cancel"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    style={{ marginTop: '16px' }}
                >
                    <Form.Item
                        name="key"
                        label="Setting Name"
                    >
                        <Input
                            disabled
                            style={{ backgroundColor: '#f5f5f5' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="value"
                        label="Value"
                        rules={[
                            { required: true, message: 'Please enter a value' }
                        ]}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder="Enter setting value..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
