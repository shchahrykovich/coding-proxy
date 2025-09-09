import {NextRequest} from 'next/server';
import {getResponseFromProvider} from "@/lib/proxy";
import {getDB} from "@/lib/utils";

async function proxyToSpecificService(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> },
) {
    const params = await context.params;
    if (!Array.isArray(params.slug) || (params.slug?.length ?? 0) < 2 || !params?.slug) {
        return new Response('Proxy not found', {status: 404});
    }

    const key = params.slug[0];
    const db = await getDB();
    const proxy = await db.proxies.findUnique({
        where: {apiKey: key},
    })
    if (!proxy) {
        return new Response('Proxy not found', {status: 404});
    }

    const provider = params.slug[1].toLowerCase();
    const url = params.slug.slice(2).join('/') ?? '';

    return getResponseFromProvider(proxy, request, url, provider);
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return proxyToSpecificService(request, context);
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return proxyToSpecificService(request, context);
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return proxyToSpecificService(request, context);
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return proxyToSpecificService(request, context);
}

export async function OPTIONS(
    request: NextRequest,
    context: { params: Promise<{ slug?: string[] }> }
) {
    return proxyToSpecificService(request, context);
}
