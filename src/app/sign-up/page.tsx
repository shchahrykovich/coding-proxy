'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {Form, Input, Button, Alert, Card, Typography, Space} from 'antd'
import {UserOutlined, LockOutlined, CheckCircleOutlined} from '@ant-design/icons'
import styles from '../page.module.css'

const {Title, Text} = Typography

export default function SignUpPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const [form] = Form.useForm()

    const handleSubmit = async (values: { email: string; password: string }) => {
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/sign-up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            })

            const data: { error: string, ok: boolean } = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Sign up failed')
            }

            setSuccess(true)
            // Redirect to sign in page after successful registration
            setTimeout(() => {
                router.push('/api/auth/signin')
            }, 2000)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: 0
            }}>
                <Card style={{textAlign: 'center', minWidth: 400}}>
                    <CheckCircleOutlined style={{fontSize: 48, color: '#52c41a', marginBottom: 16}}/>
                    <Title level={2}>Account Created Successfully!</Title>
                    <Text type="secondary">Redirecting you to sign in...</Text>
                </Card>
            </div>
        )
    }

    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 0}}>
            <Card style={{width: 400, padding: '24px'}}>
                <Title level={2} style={{textAlign: 'center', marginBottom: 32}}>
                    Sign Up
                </Title>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{marginBottom: 24}}
                    />
                )}

                <Form
                    form={form}
                    name="signup"
                    onFinish={handleSubmit}
                    autoComplete="off"
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        required
                        rules={[
                            {required: true, message: 'Please input your email!'},
                            {type: 'email', message: 'Please enter a valid email!'}
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined/>}
                            placeholder="Enter your email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            {required: true, message: 'Please input your password!'},
                            {min: 8, message: 'Password must be at least 8 characters long!'}
                        ]}
                        extra="Password must be at least 8 characters long"
                    >
                        <Input.Password
                            prefix={<LockOutlined/>}
                            placeholder="Enter your password"
                        />
                    </Form.Item>

                    <Form.Item style={{marginBottom: 0}}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isLoading}
                            block
                            style={{marginBottom: 16}}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{textAlign: 'center'}}>
                    <Text>
                        Already have an account?{' '}
                        <Link href="/api/auth/signin">
                            Sign In
                        </Link>
                    </Text>
                </div>
            </Card>
        </div>
    )
}
