import 'server-only'

import NextAuth from "next-auth";
import {NextAuthResult} from "next-auth";
import {PrismaAdapter} from "@auth/prisma-adapter"
import {getDB} from "@/lib/utils";
import bcrypt from 'bcryptjs'
import Credentials from 'next-auth/providers/credentials'
import * as zod from 'zod'

export const SignInSchema = zod.object({
    email: zod.string().email({
        message: 'Invalid email address',
    }),
    password: zod.string().min(1, {
        message: 'Password must be at least 8 characters long',
    }),
})


const authResult = async (): Promise<NextAuthResult> => {
    return NextAuth({
        providers: [
            Credentials({
                credentials: {
                    email: {
                        label: "Email"
                    },
                    password: {
                        label: "Password",
                        type: "password"
                    },
                },
                authorize: async (credentials) => {
                    const db = await getDB();
                    const {email, password} = await SignInSchema.parseAsync(credentials)

                    const user = await db.user.findUnique({
                        where: {
                            email,
                        },
                    });

                    if (!user) {
                        throw new Error('No user found')
                    }

                    const isValid = bcrypt.compareSync(password, user.password!)

                    if (!isValid) {
                        throw new Error('Invalid password')
                    }

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                    }
                },
            }),
        ],
        pages: {
            signIn: '/sign-in'
        },
        adapter: PrismaAdapter(await getDB()),
        session: {
            strategy: "jwt",
            maxAge: 30 * 24 * 60 * 60, // 30 days
        },
        callbacks: {
            async jwt({ token, user }) {
                if (user) {
                    token.id = user.id;
                }
                return token;
            },
            async session({ session, token }) {
                if (token) {
                    session.user.id = token.id as string;
                }
                return session;
            },
        },
        trustHost: true,
        debug: process.env.NODE_ENV === 'development',
    });
};

export const {handlers, signIn, signOut, auth} = await authResult();
