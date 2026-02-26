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

// 1. 20 个城市及中心坐标
const CITIES = [
    { name: '北京', lat: 39.9042, lng: 116.4074, district: '朝阳区' },
    { name: '上海', lat: 31.2304, lng: 121.4737, district: '黄浦区' },
    { name: '广州', lat: 23.1291, lng: 113.2644, district: '天河区' },
    { name: '深圳', lat: 22.5431, lng: 114.0579, district: '南山区' },
    { name: '成都', lat: 30.5728, lng: 104.0668, district: '锦江区' },
    { name: '杭州', lat: 30.2741, lng: 120.1551, district: '西湖区' },
    { name: '重庆', lat: 29.5630, lng: 106.5516, district: '渝中区' },
    { name: '武汉', lat: 30.5928, lng: 114.3055, district: '江汉区' },
    { name: '西安', lat: 34.3416, lng: 108.9398, district: '雁塔区' },
    { name: '苏州', lat: 31.2989, lng: 120.5853, district: '姑苏区' },
    { name: '南京', lat: 32.0603, lng: 118.7969, district: '玄武区' },
    { name: '天津', lat: 39.0842, lng: 117.2009, district: '和平区' },
    { name: '郑州', lat: 34.7466, lng: 113.6253, district: '金水区' },
    { name: '长沙', lat: 28.2282, lng: 112.9388, district: '芙蓉区' },
    { name: '东莞', lat: 23.0205, lng: 113.7518, district: '南城街道' },
    { name: '宁波', lat: 29.8683, lng: 121.5439, district: '鄞州区' },
    { name: '佛山', lat: 23.0215, lng: 113.1214, district: '禅城区' },
    { name: '合肥', lat: 31.8206, lng: 117.2272, district: '蜀山区' },
    { name: '青岛', lat: 36.0671, lng: 120.3826, district: '市南区' },
    { name: '大连', lat: 38.9140, lng: 121.6147, district: '中山区' }
];

// 2. 名字池
const PREFIXES = ['皇冠', '希尔顿', '万豪', '亚朵', '全季', '悦榕庄', '洲际', '喜来登', '凯悦', '丽思', '香格里拉', '桔子', '汉庭', '如家', '维也纳'];
const SUFFIXES = ['大酒店', '度假村', '精品酒店', '公寓', '公馆', '国际酒店', '中心酒店', '商旅酒店', '电竞酒店'];

// 3. 标签池 —— 按类型分组，方便按星级智能组合
const FACILITY_TAGS = ['免费停车', '健身房', '恒温游泳池', 'SPA', '会议室', '咖啡厅', '自助洗衣房', '私人影院'];
const SERVICE_TAGS = ['免费WIFI', '24小时前台', '行李寄存', '接机服务', '智能客控', '机器人送物', '近地铁'];
const VIBE_TAGS = ['情侣主题', '带浴缸', '全景落地窗', '海景/江景', '氛围感灯光', '隔音极佳'];
const FAMILY_TAGS = ['儿童乐园', '家庭套房', '提供婴儿床', '亲子活动'];
const SPECIAL_TAGS = ['钟点房', '高配电脑', '千兆光纤', '电竞椅', '宠物友好'];

// 星级 → 评分区间映射
const STAR_SCORE_MAP: Record<number, [number, number]> = {
    2: [3.0, 3.9],
    3: [3.5, 4.3],
    4: [4.0, 4.7],
    5: [4.5, 5.0],
};

// 星级 → 标签数量映射（高星酒店设施更丰富）
const STAR_TAG_COUNT: Record<number, { facility: number; service: number; extra: number }> = {
    2: { facility: 1, service: 2, extra: 1 },
    3: { facility: 2, service: 3, extra: 1 },
    4: { facility: 3, service: 4, extra: 2 },
    5: { facility: 5, service: 5, extra: 3 },
};

function generateHotelTags(star: number): string[] {
    const cfg = STAR_TAG_COUNT[star] || STAR_TAG_COUNT[3];
    const tags: string[] = [];
    tags.push(...randomPickMultiple(FACILITY_TAGS, cfg.facility));
    tags.push(...randomPickMultiple(SERVICE_TAGS, cfg.service));
    const extraPool = [...VIBE_TAGS, ...FAMILY_TAGS, ...SPECIAL_TAGS];
    tags.push(...randomPickMultiple(extraPool, cfg.extra));
    return [...new Set(tags)];
}

function generateScore(star: number): number {
    const [min, max] = STAR_SCORE_MAP[star] || [3.5, 4.5];
    return Number((min + Math.random() * (max - min)).toFixed(1));
}

// 4. 高清图片池
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
    'https://images.unsplash.com/photo-1571896349842-6e5a51335022?w=800&q=80'
];

const ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'
];

// 5. 工具函数
function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPickMultiple<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 在中心点 15km 范围内均匀生成坐标
function randomLocation(centerLat: number, centerLng: number) {
    const radius = 0.15; // 约 15km
    const u = Math.random();
    const v = Math.random();
    const w = radius * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    return {
        latitude: Number((centerLat + w * Math.cos(t)).toFixed(5)),
        longitude: Number((centerLng + w * Math.sin(t)).toFixed(5))
    };
}

function getFutureDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}

// --- 主逻辑 ---

async function main() {
    console.log('🚀 开始生成海量测试数据 (预计耗时 1-3 分钟)...');

    // 1. 清理旧数据
    try {
        await prisma.homeBanner.deleteMany();
        await prisma.roomInventory.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
        console.log('🧹 旧数据清理完成');
    } catch (error) {
        console.log('⚠️ 清理数据跳过');
    }

    const bannerDataToInsert: any[] = [];
    const now = new Date();
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let globalBannerSortOrder = 1;

    // 2. 遍历 20 个城市
    for (const city of CITIES) {
        console.log(`\n🏗️  正在生成 [${city.name}] 的 100 家酒店...`);

        for (let i = 1; i <= 100; i++) {
            // --- 价格 & 星级联动 ---
            // 价位段: 0→经济, 1→舒适, 2→高端, 3→豪华, 4→奢华
            const priceBucket = i % 5;
            const basePrice = 100 + (priceBucket * 100) + randomInt(0, 99);

            // 星级与价位段关联：经济型 2-3 星，中端 3-4 星，高端 4-5 星
            const starByBucket: Record<number, number[]> = {
                0: [2, 3], 1: [2, 3], 2: [3, 4], 3: [4, 5], 4: [4, 5],
            };
            const star = randomPick(starByBucket[priceBucket]);

            const name = `${city.name}${randomPick(PREFIXES)}${randomPick(SUFFIXES)} (${i}号店)`;
            const loc = randomLocation(city.lat, city.lng);
            const hotelImages = randomPickMultiple(HOTEL_IMAGES, 5);

            // 标签：按星级智能生成
            const tags = generateHotelTags(star);
            if (i === 1) {
                tags.unshift('全国精选');
            } else if (Math.random() < 0.2) {
                tags.unshift('精选');
            }

            // 评分与星级关联
            const score = generateScore(star);

            const hotel = await prisma.hotel.create({
                data: {
                    name,
                    city: city.name,
                    address: `${city.district}某某路${randomInt(1, 999)}号`,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    coverImage: hotelImages[0],
                    images: hotelImages,
                    description: `这是位于${city.name}的一家${star}星级优质酒店，提供舒适的住宿环境和贴心的服务。`,
                    tags,
                    star,
                    priceDesc: `¥${basePrice}起`,
                    status: 1,
                    score,
                    reviewCount: randomInt(star * 50, star * 600),
                }
            });

            // --- Banner ---
            if (i === 1) {
                bannerDataToInsert.push({
                    targetCity: null,
                    hotelId: hotel.id,
                    title: `全国精选 · ${city.name}站`,
                    subTitle: '品质认证 · 闭眼入',
                    status: 1,
                    sortOrder: globalBannerSortOrder++,
                    startAt, endAt
                });
            } else if (i >= 2 && i <= 4) {
                bannerDataToInsert.push({
                    targetCity: city.name,
                    hotelId: hotel.id,
                    title: `${city.name}人气榜`,
                    subTitle: '吃喝玩乐 · 核心商圈',
                    status: 1,
                    sortOrder: globalBannerSortOrder++,
                    startAt, endAt
                });
            }

            // --- 房型：4 种差异化属性，完美覆盖所有筛选维度 ---
            const roomTypesToCreate = [
                {
                    name: '舒适大床房', price: basePrice * 100, bed: '1张1.5m床',
                    capacity: 2, hasWindow: false, hasBreakfast: false, childrenFriendly: false,
                    tags: ['免费WIFI'],
                },
                {
                    name: '商务双床房', price: (basePrice + 50) * 100, bed: '2张1.2m床',
                    capacity: 2, hasWindow: true, hasBreakfast: true, childrenFriendly: false,
                    tags: ['含早', '有窗', '办公桌', '免费WIFI'],
                },
                {
                    name: '豪华景观房', price: (basePrice + 120) * 100, bed: '1张1.8m床',
                    capacity: 2, hasWindow: true, hasBreakfast: true, childrenFriendly: true,
                    tags: ['含早', '有窗', '景观', '儿童拖鞋', '免费WIFI'],
                },
                {
                    name: '家庭套房', price: (basePrice + 300) * 100, bed: '1张2.0m床+1张1.2m床',
                    capacity: 4, hasWindow: true, hasBreakfast: true, childrenFriendly: true,
                    tags: ['含早', '有窗', '家庭出行', '儿童拖鞋', '加床服务', '免费WIFI'],
                },
            ];

            const inventoriesToInsert: any[] = [];

            // 决定这家酒店是否被"挖坑"（约 15% 的酒店会在某些天没房）
            const hasInventoryHole = Math.random() < 0.15;
            // 挖坑日期：随机选 1~3 天
            const holeDays = hasInventoryHole
                ? randomPickMultiple(Array.from({ length: 30 }, (_, k) => k), randomInt(1, 3))
                : [];

            for (const rt of roomTypesToCreate) {
                const roomType = await prisma.roomType.create({
                    data: {
                        hotelId: hotel.id,
                        name: rt.name,
                        price: rt.price,
                        bedInfo: rt.bed,
                        images: randomPickMultiple(ROOM_IMAGES, randomInt(2, 4)),
                        salesVolume: randomInt(0, 800),
                        capacity: rt.capacity,
                        hasWindow: rt.hasWindow,
                        hasBreakfast: rt.hasBreakfast,
                        childrenFriendly: rt.childrenFriendly,
                        tags: rt.tags,
                    }
                });

                for (let d = 0; d < 30; d++) {
                    const date = getFutureDate(d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    // 库存：被挖坑的日期 → 所有房型 quota=0
                    let quota: number;
                    if (holeDays.includes(d)) {
                        quota = 0;
                    } else {
                        quota = randomInt(3, 20);
                    }

                    // 价格波动：周末 +20%，随机浮动 ±8%
                    let dayPrice = rt.price;
                    if (isWeekend) dayPrice = Math.floor(dayPrice * 1.2);
                    const fluctuation = 1 + (Math.random() * 0.16 - 0.08);
                    dayPrice = Math.floor(dayPrice * fluctuation);

                    inventoriesToInsert.push({
                        roomTypeId: roomType.id,
                        date,
                        quota,
                        price: dayPrice,
                    });
                }
            }

            await prisma.roomInventory.createMany({ data: inventoriesToInsert });

            if (i % 25 === 0) {
                process.stdout.write(`...已完成 ${i} 家 `);
            }
        }
    }

    // 3. 统一插入所有 Banner
    console.log('\n\n🏷️  正在配置首页 Banner...');
    await prisma.homeBanner.createMany({ data: bannerDataToInsert });
    console.log(`✅ 成功配置 ${bannerDataToInsert.length} 个 Banner (包含全国精选和城市精选)`);

    console.log('\n🎉🎉🎉 史诗级海量数据填充完成！(共生成 2000 家酒店, 8000 个房型, 240000 条库存记录)');
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