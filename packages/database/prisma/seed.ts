//C端测试使用
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // 👈 关键修改：换成 pg 适配器
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// 边界条件清洗连接字符串
let rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error(`未找到 DATABASE_URL`);

// 边界条件去除可能存在的引号
const cleanUrl = rawUrl.trim().replace(/^['"]|['"]$/g, '');

console.log('正在初始化 pg 连接池...');

// 使用 pg Pool
const pool = new Pool({
    connectionString: cleanUrl,
    ssl: true // Neon 必需
});

// 初始化 Prisma
// 使用 PrismaPg 适配器来配合 pg 驱动
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 辅助函数
function getFutureDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
    console.log('开始执行 Seed...');

    // 测试连接
    try {
        await prisma.hotel.count(); // 让 Prisma 真正去查一下
        console.log('Prisma 适配器连接成功！');
    } catch (err) {
        console.error('Prisma 连接失败:', err);
        process.exit(1);
    }

    // 1. 清理旧数据
    try {
        console.log('正在清理旧数据...');
        await prisma.roomInventory.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
        console.log('旧数据已清理');
    } catch (error) {
        console.log('清理跳过');
    }

    // 准备数据
    const hotelsData = [
        {
            name: '北京王府井希尔顿酒店',
            address: '东城区王府井东街8号',
            city: '北京',
            latitude: 39.911,
            longitude: 116.413,
            coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            images: [
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            ],
            description: '位于繁华的王府井商业区，步行可达故宫和天安门广场。',
            tags: ['五星级', '免费停车', '健身房'],
            priceDesc: '¥1200起',
            status: 1,
            score: 4.8,
            reviewCount: 230,
            roomTypes: [
                {
                    name: '豪华大床房',
                    price: 120000,
                    bedInfo: '1张1.8米大床',
                    images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                    salesVolume: 100,
                },
                {
                    name: '行政套房',
                    price: 250000,
                    bedInfo: '1张2米特大床',
                    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                    salesVolume: 25,
                }
            ]
        },
        {
            name: '上海和平饭店',
            address: '黄浦区南京东路20号',
            city: '上海',
            latitude: 31.240,
            longitude: 121.490,
            coverImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            images: [
                'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            ],
            description: '外滩的历史地标，Art Deco 风格建筑，尽览黄浦江美景。',
            tags: ['历史建筑', '江景', '下午茶'],
            priceDesc: '¥1800起',
            status: 1,
            score: 4.9,
            reviewCount: 512,
            roomTypes: [
                {
                    name: '费尔蒙大床房',
                    price: 180000,
                    bedInfo: '1张1.8米大床',
                    images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                    salesVolume: 88,
                }
            ]
        },
        {
            name: '成都太古里博舍酒店',
            address: '锦江区笔帖式街81号',
            city: '成都',
            latitude: 30.655,
            longitude: 104.080,
            coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            images: [
                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            ],
            description: '传统川式建筑与现代设计的完美融合，位于繁华的远洋太古里。',
            tags: ['设计酒店', '太古里', '网红打卡'],
            priceDesc: '¥1500起',
            status: 1,
            score: 4.7,
            reviewCount: 340,
            roomTypes: [
                {
                    name: '博舍开间',
                    price: 155000,
                    bedInfo: '1张1.8米大床',
                    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                    salesVolume: 120,
                }
            ]
        }
    ];

    // 写入数据
    for (const hotelData of hotelsData) {
        const { roomTypes, ...hotelInfo } = hotelData;

        const hotel = await prisma.hotel.create({ data: hotelInfo });
        console.log(`✅ 创建酒店: ${hotel.name}`);

        for (const rt of roomTypes) {
            const roomType = await prisma.roomType.create({
                data: { ...rt, hotelId: hotel.id },
            });

            const inventories = [];
            for (let i = 0; i < 30; i++) {
                const date = getFutureDate(i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dailyPrice = isWeekend ? Math.floor(rt.price * 1.1) : rt.price;

                inventories.push({
                    roomTypeId: roomType.id,
                    date: date,
                    quota: randomInt(3, 10),
                    price: dailyPrice,
                });
            }
            await prisma.roomInventory.createMany({ data: inventories });
        }
    }
    console.log('数据库填充完成！');
}

main()
    .catch((e) => {
        console.error('Seed 失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
        await prisma.$disconnect();
    });