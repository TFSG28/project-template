import { Router } from 'express';
import { realtimeController } from '../../../../shared/container/controllers';

const router = Router();

// O EventSource não consegue enviar cookies cross-origin de forma fiável em
// todos os browsers, por isso a rota aceita um token curto na query.
router.get('/stream', realtimeController.stream);

export default router;
