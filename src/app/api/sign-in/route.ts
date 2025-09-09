import 'server-only'

import {NextRequest, NextResponse} from 'next/server'
import {signIn} from '@/app/auth'
import {AuthError} from 'next-auth'
import * as zod from 'zod'
import {logError} from "@/infrastructure/logging";

const SignInSchema = zod.object({
    email: zod.string().email({
        message: 'Invalid email address',
    }),
    password: zod.string().min(1, {
        message: 'Password is required',
    }),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {email, password} = await SignInSchema.parseAsync(body)

        await signIn('credentials', {
            email,
            password,
            redirect: false,
        })

        return NextResponse.json({success: true})

    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                {error: 'Invalid credentials'},
                {status: 401}
            )
        }

        if (error instanceof zod.ZodError) {
            return NextResponse.json(
                {error: 'Validation error', details: error.errors},
                {status: 400}
            )
        }

        logError(error, 'sign_in_error')
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}
