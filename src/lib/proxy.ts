import 'server-only'

import { NextRequest, NextResponse } from "next/server";
import { Proxies } from "@prisma/client";
import {getBucket, getServerContext} from "@/lib/utils";
import { v7 as uuidv7 } from 'uuid';
import {NewRequestMessage} from "@/lib/queue-messages";
import {sendNewRequestEvent} from "@/lib/queue-sender";


async function uploadRequest(
    proxy: Proxies,
    req: NextRequest,
    body: ArrayBuffer | null,
    reqId: string,
    targetUrl: string,
    targetPath: string = '',
    provider: string = '',
    requestDate: Date = new Date()
) {
    const bucket = await getBucket();

    const cleanedHeaders = Array.from(req.headers.entries()).filter(
        ([key]) => key.toLowerCase() !== 'authorization'
    );

    const meta = {
        type: 'request',
        id: reqId,
        provider: provider,
        method: req.method,
        targetUrl,
        targetPath,
        headers: cleanedHeaders,
        cf: (req as any).cf ?? undefined,
        url: req.url,
    };

    const basePath = `provider-requests/${proxy.tenantId}/${proxy.id}/${requestDate.toISOString().substring(0, 10)}`;

    await bucket.put(`${basePath}/${reqId}/request.json`, JSON.stringify(meta, null, 2), {
        httpMetadata: { contentType: 'application/json' },
    });

    if (body) {
        await bucket.put(`${basePath}/${reqId}/request.body`, body, {
            httpMetadata: { contentType: req.headers.get('content-type') ?? undefined },
            customMetadata: { related: 'request.json' },
        });
    }
}

async function uploadResponse(
    proxy: Proxies,
    res: Response,
    body: ArrayBuffer | null,
    reqId: string,
    targetUrl: string,
    targetPath: string = '',
    provider: string = '',
    requestDate: Date = new Date()
) {
    const bucket = await getBucket();

    const cleanedHeaders = Array.from(res.headers.entries()).filter(
        ([key]) => key.toLowerCase() !== 'authorization'
    );

    const meta = {
        type: 'response',
        provider: provider,
        id: reqId,
        status: res.status,
        statusText: res.statusText,
        targetUrl,
        targetPath,
        headers: cleanedHeaders,
        requestDate
    };

    const basePath = `provider-requests/${proxy.tenantId}/${proxy.id}/${requestDate.toISOString().substring(0, 10)}`;

    await bucket.put(`${basePath}/${reqId}/response.json`, JSON.stringify(meta, null, 2), {
        httpMetadata: { contentType: 'application/json' },
    });

    if (body) {
        await bucket.put(`${basePath}/${reqId}/response.body`, body, {
            httpMetadata: { contentType: res.headers.get('content-type') ?? undefined },
            customMetadata: { related: 'response.json' },
        });
    }

    await sendNewRequestEvent({
        type: 'provider-request',
        tenantId: proxy.tenantId,
        proxyId: proxy.id,
        requestId: reqId,
        provider: provider,
        requestDate
    } as NewRequestMessage);
}

export async function getResponseFromProvider(
    proxy: Proxies,
    request: NextRequest,
    targetPath: string,
    provider: string,
) {
    try {
        let targetUrl = 'https://api.anthropic.com';
        if (provider === 'openai') {
            targetUrl = 'https://api.openai.com';
        } else if (provider === 'codex') {
            targetUrl = 'https://chatgpt.com/backend-api/codex';
        }

        const requestDate = new Date();

        const reqId = uuidv7();
        const url = `${targetUrl}/${targetPath}`;

        const headers = new Headers();
        request.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'host') headers.set(key, value);
        });

        const fetchOptions: RequestInit = {
            method: request.method,
            headers,
        };

        let bodyBuf: ArrayBuffer | null = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            bodyBuf = await request.arrayBuffer();
            fetchOptions.body = bodyBuf;
            // @ts-expect-error: duplex required for streaming requests in edge runtimes
            fetchOptions.duplex = 'half';
        }

        const { ctx } = await getServerContext();

        // Log request in background as ArrayBuffer (use a separate clone for reading)
        ctx.waitUntil(uploadRequest(proxy, request, bodyBuf, reqId, targetUrl, targetPath, provider, requestDate));

        // Send upstream
        const response = await fetch(url, fetchOptions);

        // Clone once for returning, once for logging the ArrayBuffer
        const resForClient = response.clone();
        const resForLog = response.clone();

        // Log response in background as ArrayBuffer
        ctx.waitUntil(
            (async () => {
                const bodyBuf = await resForLog.arrayBuffer();
                await uploadResponse(proxy, response, bodyBuf, reqId, targetUrl, targetPath, provider, requestDate);
            })()
        );

        const responseHeaders = new Headers();
        response.headers.forEach((value, key) => responseHeaders.set(key, value));

        return new NextResponse(resForClient.body, {
            status: resForClient.status,
            statusText: resForClient.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
    }
}
