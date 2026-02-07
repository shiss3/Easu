import { Router } from 'express';
import { searchHotels } from '../controllers/hotel-search.controller';
import {getHotelDetail} from "../controllers/hotel-detail.controller";
import { getBanners } from '../controllers/home.controller';
import authRoutes from './auth.routes';

const router = Router();

// 定义路由：POST /hotel/search
router.post('/hotel/search', searchHotels);

//定义路由：GET /hotel/:id
router.get('/hotel/:id', getHotelDetail);

// 首页 Banner：GET /home/banners
router.get('/home/banners', getBanners);
//定义路由：POST /auth
router.use('/auth', authRoutes);
export default router;