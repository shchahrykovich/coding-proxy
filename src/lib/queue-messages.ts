import 'server-only'

export type BaseMessage = {
    type: 'provider-request'
        | 'update-session',
}

export type NewRequestMessage = BaseMessage & {
    tenantId: number,
    proxyId: number,
    requestId: string,
    provider: string,
    requestDate: Date
};

export type UpdateWorkSessionMessage = BaseMessage & {
    tenantId: number,
    sessionId: number,
    provider: string,
};
