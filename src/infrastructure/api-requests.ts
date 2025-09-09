import 'server-only'
import {NextResponse} from "next/server";
import * as zod from "zod";
import {logError} from "@/infrastructure/logging";

export function createZodErrorResponse(error: zod.ZodError) {
    return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
    }, {status: 400});
}

export function createErrorResponse(error: any, name: string = 'generic_error', props:  Record<string, unknown> = {}) {
    if (error instanceof zod.ZodError) {
        return createZodErrorResponse(error);
    }

    logError(error, name, props);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
}

export function createSuccessJsonResponse(json: unknown, status: number = 200) {
    return NextResponse.json(json, {status: status});
}
