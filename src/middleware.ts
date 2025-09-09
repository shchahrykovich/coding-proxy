import 'server-only'
import { auth } from '@/app/auth'

const WHITE_LIST = [
    '/sign-in',
    '/api/sign-up',
    '/api/sign-in',
    '/sign-up'
];

export default auth((req) => {
    // Redirect to sign-in page if not authenticated
    if (!req.auth && !WHITE_LIST.includes(req.nextUrl.pathname)) {
        const url = new URL('/sign-in', req.nextUrl.origin)
        return Response.redirect(url)
    }

    if (req.auth && req.nextUrl.pathname === '/auth/signin') {
        return Response.redirect(new URL('/', req.nextUrl.origin));
    }
})

export const config = {
    matcher: [
        "/((?!api/auth|api/health|api/proxy|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
}
