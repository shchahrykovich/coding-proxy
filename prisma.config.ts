import path from 'node:path'
import type { PrismaConfig } from 'prisma'

export default {
    schema: path.join('prisma'),
    experimental: {
        externalTables: true,
    },
    tables: {
        external: [
            "MemoryRecordsForSearch",
            "MemoryRecordsForSearch_config",
            "MemoryRecordsForSearch_content",
            "MemoryRecordsForSearch_data",
            "MemoryRecordsForSearch_docsize",
            "MemoryRecordsForSearch_idx",
        ],
    },
} satisfies PrismaConfig
