import 'server-only'

import {NextResponse} from 'next/server'

export async function GET() {
    return NextResponse.json(
        { error: 'Error check' },
        { status: 500 }
    );
}
