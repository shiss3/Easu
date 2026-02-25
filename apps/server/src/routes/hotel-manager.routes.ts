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
router.post('/admin/offline/:id', requireAdmin, setHotelOffline);
router.post('/admin/online/:id', requireAdmin, setHotelOnline);
router.post('/upload', uploadMiddleware.single('file'), uploadImage);
router.post('/merchant/hotels', createMerchantHotel);

export default router;
