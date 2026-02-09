import type { Request, Response } from 'express';

const AMAP_KEY = process.env.AMAP_KEY || 'YOUR_AMAP_KEY'; // TODO: 替换为真实高德 Key

const parseNumber = (value: unknown) => {
    if (typeof value === 'string') {
        const n = Number.parseFloat(value);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return null;
};

// GET /api/location/regeo?lat=31.2304&lng=121.4737
export const getRegeoLocation = async (req: Request, res: Response) => {
    try {
        const lat = parseNumber(req.query.lat);
        const lng = parseNumber(req.query.lng);

        if (lat === null || lng === null) {
            res.status(400).json({
                code: 400,
                message: '缺少经纬度参数',
                data: null,
            });
            return;
        }

        if (!AMAP_KEY || AMAP_KEY === 'YOUR_AMAP_KEY') {
            res.status(500).json({
                code: 500,
                message: '高德 Key 未配置',
                data: null,
            });
            return;
        }

        const params = new URLSearchParams({
            key: AMAP_KEY,
            location: `${lng},${lat}`,
            extensions: 'all',
            radius: '200',
        });
        const response = await fetch(`https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`);
        const result = await response.json();

        if (!response.ok || result.status !== '1') {
            res.status(502).json({
                code: 502,
                message: result.info || '高德地图服务异常',
                data: null,
            });
            return;
        }

        const regeocode = result.regeocode ?? {};
        const addressComponent = regeocode.addressComponent ?? {};
        const cityValue = Array.isArray(addressComponent.city)
            ? addressComponent.province
            : (addressComponent.city || addressComponent.province || '');
        const formattedAddress = regeocode.formatted_address || '';
        const pois = Array.isArray(regeocode.pois) ? regeocode.pois : [];
        const topPoi = pois[0] || {};

        res.json({
            code: 200,
            message: '查询成功',
            data: {
                city: cityValue,
                formattedAddress,
                poiName: topPoi.name || '',
                poiAddress: topPoi.address || '',
            },
        });
    } catch (error) {
        console.error('Regeo Error:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            data: null,
        });
    }
};
