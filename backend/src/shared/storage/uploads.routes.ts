import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import os from 'node:os';
import path from 'node:path';
import { authMiddleware } from '../middleware/auth.middleware';
import { csrfMiddleware } from '../middleware/csrf.middleware';
import { asyncHandler } from '../utils/async-handler';
import { ApiResponse } from '../utils/api-response';
import { InvalidUploadError, localAttachmentStorage } from './LocalAttachmentStorage.service';
import { isDangerousUpload } from './upload.security';

const router = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// O parser multipart corre depois da auth: não gastamos I/O a ler uploads de
// pedidos não autenticados.
const multipart = fileUpload({
    limits: { fileSize: MAX_UPLOAD_BYTES },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: path.join(os.tmpdir(), 'perfect-template-uploads'),
    createParentPath: true,
});

router.post(
    '/',
    authMiddleware,
    csrfMiddleware,
    multipart,
    asyncHandler(async (req: Request, res: Response) => {
        const raw = req.files?.file;
        const file = (Array.isArray(raw) ? raw[0] : raw) as UploadedFile | undefined;

        if (!file) throw new InvalidUploadError('Envia um ficheiro no campo "file"');
        if (file.size > MAX_UPLOAD_BYTES) throw new InvalidUploadError('Ficheiro demasiado grande (máx. 25 MB)');
        if (isDangerousUpload(file.name)) throw new InvalidUploadError('Tipo de ficheiro não permitido');

        const stored = await localAttachmentStorage.save(
            {
                tempFilePath: file.tempFilePath,
                data: file.data,
                originalName: file.name,
            },
            `users/${req.user!.userId}`
        );

        return ApiResponse.created(res, {
            url: stored.url,
            filename: file.name,
            size: file.size,
            contentType: file.mimetype,
        });
    })
);

export default router;
