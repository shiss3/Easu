import { Router } from 'express';
import { searchHotels } from '../controllers/hotel-search.controller';

const router = Router();

// 定义路由：POST /hotel/search
router.post('/hotel/search', searchHotels);

export default router;