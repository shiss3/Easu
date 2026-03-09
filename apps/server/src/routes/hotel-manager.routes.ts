import { Router } from 'express';
import { requireManager } from '../middlewares/requireManager';
import { requireAdmin } from '../middlewares/requireAdmin';
import { uploadMiddleware } from '../services/upload.service';
import {
    uploadImage,
    createMerchantHotel,
    getHotelList,
    getHotelDetailForEdit,
    getDashboardStats,
    updateHotel,
    auditHotel,
    setHotelOffline,
    setHotelOnline,
} from '../controllers/hotel-manager.controller';

const router = Router();

router.use(requireManager);

router.get('/dashboard/stats', getDashboardStats);
router.get('/hotels/:id', getHotelDetailForEdit);
router.patch('/hotels/:id', updateHotel);
router.get('/hotels', getHotelList);
router.post('/admin/audit/:id', requireAdmin, auditHotel);
// 上下线操作：管理员和商户都可调用（商户仅能操作自己的酒店）
router.post('/admin/offline/:id', setHotelOffline);
router.post('/admin/online/:id', setHotelOnline);
router.post('/upload', uploadMiddleware.single('file'), uploadImage);
router.post('/merchant/hotels', createMerchantHotel);

export default router;
