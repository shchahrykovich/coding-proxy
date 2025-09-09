import 'server-only'

import {NextResponse} from 'next/server'
import {logError, logInfo} from "@/infrastructure/logging";

export async function GET() {
    logInfo('test', {
        test: 1
    });
    logError(new Error('test-error'), 'test_error', {
        test: 'ok'
    });
    return NextResponse.json({success: true})
}
