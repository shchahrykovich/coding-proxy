import {Prisma} from "@prisma/client";

export function getQueryForAvailableWorkSessions(tenantId: number): Prisma.WorkSessionsWhereInput {
    return {
        tenantId: tenantId,
        totalRequests: {
            gt: 2
        }
    } as Prisma.WorkSessionsWhereInput;
}
