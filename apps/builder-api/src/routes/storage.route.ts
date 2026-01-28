import { Router } from 'express';
import { s3Service } from '@surveychamp/backend-core';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '@surveychamp/common';

export const storageRouter = Router();

storageRouter.post('/upload-url', authenticate,async (req, res) => {
    try {
        const { filename, fileType } = req.body;

        if (!filename || !fileType) {
            res.status(400).json({ error: "Filename and fileType are required" });
            return;
        }

        const ext = filename.split('.').pop();
        const key = `uploads/${uuidv4()}.${ext}`;

        const { uploadUrl } = await s3Service.generateUploadUrl(key, fileType);
        
        // Return the permanent Redirect URL instead of the temporary signed URL
        // Content will be served via the /view/:key endpoint which redirects
        const protocol = req.protocol;
        const host = req.get('host');
        // In monorepo, ensure the path aligns with how the router is mounted. 
        // If mounted at /api/storage, then /api/storage/view/ is correct.
        const publicUrl = `${protocol}://${host}/api/storage/view/${key}`;

        res.json({ uploadUrl, publicUrl, key });
    } catch (error: any) {
        console.error("S3 Upload Error:", error);
        res.status(500).json({ error: "Failed to generate upload URL" });
    }
});

storageRouter.get('/view/uploads/:key',async (req, res) => {
    try {
        const key = req.params.key; 
        
        if (!key) {
            res.status(400).send("File key is required");
            return;
        }

        // Generate a fresh 5-minute signed URL
        const signedUrl = await s3Service.generatePresignedGetUrl(`uploads/${key}`);
        
        // Redirect the browser to the signed S3 URL
        res.redirect(signedUrl);
    } catch (error) {
        console.error("Storage View Error:", error);
        res.status(404).send("File not found or access denied");
    }
});
