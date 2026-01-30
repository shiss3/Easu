// packages/database/src/index.ts
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// 1. 配置 Neon 使用 WebSocket (这对 Serverless 环境更稳定)
neonConfig.webSocketConstructor = ws;

// 2. 定义全局类型，防止 HMR 导致连接数爆炸
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 3. 初始化连接逻辑
const connectionString = process.env.DATABASE_URL;

// 创建连接池
const pool = new Pool({ connectionString });
// 创建 Prisma 适配器
const adapter = new PrismaNeon(pool as any);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ['query', 'error', 'warn'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';