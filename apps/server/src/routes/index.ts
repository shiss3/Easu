import { Router } from 'express';
import { searchHotels } from '../controllers/hotel-search.controller';
import {getHotelDetail} from "../controllers/hotel-detail.controller";
import { getBanners } from '../controllers/home.controller';
import { getHolidayList } from '../controllers/calendar.controller';
import { getRegeoLocation } from '../controllers/location.controller';
import { getCities } from '../controllers/city.controller';
import { postChat } from '../controllers/chat.controller';
import authRoutes from './auth.routes';

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
// 城市列表：GET /cities
router.get('/cities', getCities);
// AI 聊天：POST /chat
router.post('/chat', postChat);
//定义路由：POST /auth
router.use('/auth', authRoutes);
export default router;