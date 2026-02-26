import { Router } from 'express';
import { searchHotels } from '../controllers/hotel-search.controller';
import { getHotelDetail } from '../controllers/hotel-detail.controller';
import { getBanners } from '../controllers/home.controller';
import { getHolidayList } from '../controllers/calendar.controller';
import { getRegeoLocation } from '../controllers/location.controller';
import { postChat } from '../controllers/chat.controller';
import { requireMerchant } from '../middlewares/requireMerchant';
import { uploadMiddleware } from '../services/upload.service';
import { uploadImage } from '../controllers/hotel-manager.controller';
import authRoutes from './auth.routes';
import authManagerRoutes from './auth-manager.routes';
import hotelManagerRoutes from './hotel-manager.routes';

const router = Router();

// 定义路由：POST /hotel/search
router.post('/hotel/search', searchHotels);

//定义路由：GET /hotel/:id
router.get('/hotel/:id', getHotelDetail);

// 首页 Banner：GET /home/banners
router.get('/home/banners', getBanners);

// 日历节假日：GET /calendar/holidays
router.get('/calendar/holidays', getHolidayList);
// 定位逆地理：GET /location/regeo
router.get('/location/regeo', getRegeoLocation);
// AI 聊天：POST /chat
router.post('/chat', postChat);
// C 端认证：POST /auth/*
router.use('/auth', authRoutes);

// B 端管理端认证：POST /auth-manager/*
router.use('/auth-manager', authManagerRoutes);

// 图片上传：FormData → multer(Buffer) → 阿里云 OSS → 返回 CDN 地址（需商户登录）
router.post('/upload', requireMerchant, uploadMiddleware.single('file'), uploadImage);

// B 端酒店业务：/hotel-manager/*
router.use('/hotel-manager', hotelManagerRoutes);
export default router;