import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

//Express 热重载导致连接数爆炸
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("未在环境变量中找到 DATABASE_URL");
}

// 去除可能存在的多余引号
const cleanUrl = connectionString.trim().replace(/^['"]|['"]$/g, '');

// 创建连接池 (使用标准 TCP 连接)
const pool = new Pool({
    connectionString: cleanUrl,
    ssl: true, // Neon 必须开启 SSL
    max: 10    // 连接池限制
});

//创建适配器
const adapter = new PrismaPg(pool);

// 初始化 Prisma Client
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

// 防止热重载产生多个实例
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';