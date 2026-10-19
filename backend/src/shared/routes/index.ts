import { Router } from 'express';
import authRoutes from '../../modules/auth/presentation/routes/auth.routes';
import userRoutes from '../../modules/user/presentation/routes/user.routes';
import diagnosticsRoutes from '../../modules/diagnostics/presentation/routes/diagnostics.routes';
import realtimeRoutes from '../../modules/realtime/presentation/routes/realtime.routes';
import uploadRoutes from '../storage/uploads.routes';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/diagnostics', diagnosticsRoutes);
router.use('/realtime', realtimeRoutes);
router.use('/uploads', uploadRoutes);

router.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        error: 'Not found',
        path: req.path,
    });
});

export default router;
