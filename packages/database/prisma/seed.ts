import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error(`未找到 DATABASE_URL`);
const cleanUrl = rawUrl.trim().replace(/^['"]|['"]$/g, '');

const pool = new Pool({ connectionString: cleanUrl, ssl: true });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- 辅助数据与函数 ---

// 1. 城市中心坐标
const CITIES = [
    { name: '北京', lat: 39.9042, lng: 116.4074, district: '东城区' },
    { name: '上海', lat: 31.2304, lng: 121.4737, district: '黄浦区' },
    { name: '成都', lat: 30.5728, lng: 104.0668, district: '锦江区' }
];

// 2. 名字前缀和后缀，用于生成随机酒店名
const PREFIXES = ['皇冠', '希尔顿', '万豪', '亚朵', '全季', '悦榕庄', '洲际', '喜来登', '凯悦', '丽思', '香格里拉', '半岛', '瑰丽', '柏悦', 'W'];
const SUFFIXES = ['大酒店', '度假村', '精品酒店', '公寓', '公馆', '国际酒店', '中心酒店', '花园酒店'];

// 3. 图片池 (Unsplash 高质量图)
const HOTEL_IMAGES = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
    'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-6e5a51335022?w=800&q=80',
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    'https://images.unsplash.com/photo-1551918120-9739cb747127?w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    'https://images.unsplash.com/photo-1518733057094-95b53143d2a7?w=800&q=80',
    'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80',
    'https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=800&q=80'
];

const ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
    'https://images.unsplash.com/photo-1505693416388-b0346efee86b?w=800&q=80',
    'https://images.unsplash.com/photo-1576675784201-0e142b423952?w=800&q=80'
];

const ROOM_TYPES_CONFIG = [
    { name: '标准大床房', priceBase: 35000, bed: '1张1.5米大床' },
    { name: '高级双床房', priceBase: 48000, bed: '2张1.2米单人床' },
    { name: '豪华观景房', priceBase: 68000, bed: '1张1.8米大床' },
    { name: '行政套房', priceBase: 120000, bed: '1张2米特大床' }
];

// 4. 工具函数

// 生成随机整数
function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机获取数组中的一个元素
function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 随机获取多个不重复的元素
function randomPickMultiple<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 生成中心点附近的随机坐标 (radius 约为 0.1 度，大概 10km 范围)
function randomLocation(centerLat: number, centerLng: number) {
    const radius = 0.08;
    const u = Math.random();
    const v = Math.random();
    const w = radius * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);
    // 简单的经纬度偏移，不考虑地球曲率的精确修正，够用了
    const newLat = centerLat + x;
    const newLng = centerLng + y;
    return { latitude: Number(newLat.toFixed(4)), longitude: Number(newLng.toFixed(4)) };
}

// 生成未来日期
function getFutureDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}

// --- 主逻辑 ---

async function main() {
    console.log('🚀 开始生成海量测试数据...');

    // 1. 清理数据
    try {
        // 注意：HomeBanner 关联 Hotel，必须先删 Banner 再删 Hotel，否则会触发外键限制
        await prisma.homeBanner.deleteMany();
        await prisma.roomInventory.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
        console.log('🧹 旧数据清理完成');
    } catch (error) {
        console.log('⚠️ 清理数据跳过');
    }

    // 2. 循环生成
    for (const city of CITIES) {
        console.log(`\n🏗️  正在生成 ${city.name} 的数据...`);

        // 每个城市生成 15 家酒店
        for (let i = 1; i <= 15; i++) {
            // 随机名字
            const name = `${city.name}${randomPick(PREFIXES)}${randomPick(SUFFIXES)} (${i}号店)`;

            // 随机位置
            const loc = randomLocation(city.lat, city.lng);

            // 随机图片 (取 5 张作为相册，第 1 张作为封面)
            const hotelImages = randomPickMultiple(HOTEL_IMAGES, 5);
            const coverImage = hotelImages[0];

            // 随机标签 (30% 的概率加上 '精选' 标签)
            const tags = ['免费WIFI', '含早', randomPick(['健身房', '游泳池', 'SPA', '会议室'])];
            const isFeatured = Math.random() < 0.3; // 30% 概率
            if (isFeatured) {
                tags.unshift('精选'); // 把精选放在第一个
            }

            // 随机评分
            const score = Number((4.0 + Math.random()).toFixed(1)); // 4.0 - 5.0
            const reviewCount = randomInt(50, 2000);

            // 随机价格起价 (显示用)
            const startPrice = randomInt(300, 1500);

            // 写入酒店
            const hotel = await prisma.hotel.create({
                data: {
                    name,
                    city: city.name,
                    address: `${city.district}某某街道${randomInt(1, 999)}号`,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    coverImage,
                    images: hotelImages,
                    description: `这是一安位于${city.name}市中心的豪华酒店，交通便利，环境优雅。为您提供顶级的住宿体验。`,
                    tags: tags,
                    priceDesc: `¥${startPrice}起`,
                    status: 1,
                    score,
                    reviewCount
                }
            });

            // 生成 4 种房型
            for (const rtConfig of ROOM_TYPES_CONFIG) {
                // 价格浮动
                const price = rtConfig.priceBase + randomInt(-5000, 5000);

                // 随机选一张房型图，确保不同房型图不一样
                const rtImage = randomPick(ROOM_IMAGES);

                const roomType = await prisma.roomType.create({
                    data: {
                        hotelId: hotel.id,
                        name: rtConfig.name,
                        price: price,
                        bedInfo: rtConfig.bed,
                        images: [rtImage], // 房型图
                        salesVolume: randomInt(0, 500)
                    }
                });

                // 生成 30 天库存
                const inventories = [];
                for (let d = 0; d < 30; d++) {
                    const date = getFutureDate(d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    // 周末涨价 20%
                    const dailyPrice = isWeekend ? Math.floor(price * 1.2) : price;

                    inventories.push({
                        roomTypeId: roomType.id,
                        date: date,
                        quota: randomInt(5, 20),
                        price: dailyPrice
                    });
                }
                await prisma.roomInventory.createMany({ data: inventories });
            }
        }
        console.log(`✅ ${city.name} 15 家酒店生成完毕`);
    }

    // 3. 生成首页 Banner（基于已存在的酒店数据）
    const now = new Date();
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 昨天开始投放
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 天后结束
    const campaignId = 'seed-home-banner';

    // 每个城市挑 3 个（按评分/点评排序）
    const pickTopHotels = async (cityName: string, take: number) => {
        return prisma.hotel.findMany({
            where: { city: cityName, status: 1 },
            orderBy: [{ score: 'desc' }, { reviewCount: 'desc' }],
            take,
            select: { id: true, name: true, coverImage: true, score: true, reviewCount: true },
        });
    };

    const [shanghaiTop, chengduTop, beijingTop] = await Promise.all([
        pickTopHotels('上海', 3),
        pickTopHotels('成都', 3),
        pickTopHotels('北京', 3),
    ]);

    const usedHotelIds = new Set<number>([
        ...shanghaiTop.map((h) => h.id),
        ...chengduTop.map((h) => h.id),
        ...beijingTop.map((h) => h.id),
    ]);

    const nationwideTop = await prisma.hotel.findMany({
        where: {
            status: 1,
            id: { notIn: Array.from(usedHotelIds) },
        },
        orderBy: [{ score: 'desc' }, { reviewCount: 'desc' }],
        take: 2,
        select: { id: true, name: true, coverImage: true, score: true, reviewCount: true },
    });

    let sortOrder = 1;
    const bannerData = [
        ...shanghaiTop.map((h, idx) => ({
            targetCity: '上海' as string | null,
            hotelId: h.id,
            title: idx === 0 ? '上海精选酒店' : null, // 留空测试 title 兜底（为空则用 hotel.name）
            subTitle: idx === 0 ? '高评分推荐 · 会员专享' : '人气必住 · 限时优惠',
            imageUrlOverride: null, // 留空测试封面兜底（为空则用 hotel.coverImage）
            status: 1,
            sortOrder: sortOrder++,
            startAt,
            endAt,
            trackCode: null,
            campaignId,
        })),
        ...chengduTop.map((h, idx) => ({
            targetCity: '成都' as string | null,
            hotelId: h.id,
            title: idx === 0 ? '成都精选酒店' : null,
            subTitle: idx === 0 ? '吃住行都方便 · 热门商圈' : '口碑优选 · 立即预订',
            imageUrlOverride: null,
            status: 1,
            sortOrder: sortOrder++,
            startAt,
            endAt,
            trackCode: null,
            campaignId,
        })),
        ...beijingTop.map((h, idx) => ({
            targetCity: '北京' as string | null,
            hotelId: h.id,
            title: idx === 0 ? '北京精选酒店' : null,
            subTitle: idx === 0 ? '近地铁 · 出行无忧' : '热销爆款 · 评分优选',
            imageUrlOverride: null,
            status: 1,
            sortOrder: sortOrder++,
            startAt,
            endAt,
            trackCode: null,
            campaignId,
        })),
        ...nationwideTop.map((h, idx) => ({
            targetCity: null as string | null,
            hotelId: h.id,
            title: idx === 0 ? '全国通投 · 热门精选' : null,
            subTitle: idx === 0 ? '全站爆款 · 限时特惠' : '高评分口碑 · 即刻出发',
            imageUrlOverride: null,
            status: 1,
            sortOrder: sortOrder++,
            startAt,
            endAt,
            trackCode: null,
            campaignId,
        })),
    ];

    await prisma.homeBanner.createMany({ data: bannerData });
    console.log('🏷️  HomeBanner 已生成：上海 3、成都 3、北京 3、全国通投 2');

    console.log('\n🎉 所有数据填充完成！');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
        await prisma.$disconnect();
    });