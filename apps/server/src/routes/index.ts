import { Router } from 'express';
import { searchHotels } from '../controllers/hotel-search.controller';
import {getHotelDetail} from "../controllers/hotel-detail.controller";

const router = Router();

// 定义路由：POST /hotel/search
router.post('/hotel/search', searchHotels);

//定义路由：GET /hotel/:id
router.get('/hotel/:id', getHotelDetail);

export default router;