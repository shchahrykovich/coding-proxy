'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button, Alert, Card, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface SignInFormProps {
  error?: string
  callbackUrl?: string
}

export default function SignInForm({ error, callbackUrl }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const response = await fetch('/api/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data: any = await response.json()

      if (!response.ok) {
        setLoginError(data.error || 'Sign in failed')
        return
      }

      // Redirect to home or callback URL
      router.push(callbackUrl ?? '/')

    } catch (err) {
      setLoginError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 0 }}>
      <Card style={{ width: 400, padding: '24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          Sign In
        </Title>

        {(error || loginError) && (
          <Alert
            message={loginError || "Authentication failed. Please check your credentials."}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              prefix={<UserOutlined />}
              placeholder="Enter your email"
              size="large"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Password
            </label>
            <Input.Password
              id="password"
              name="password"
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
              required
            />
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            block
            size="large"
            style={{ marginBottom: 16 }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <Text>
            Do not have an account?{' '}
            <a href="/sign-up" style={{ color: '#1890ff' }}>
              Sign Up
            </a>
          </Text>
        </div>
      </Card>
    </div>
  )
}
