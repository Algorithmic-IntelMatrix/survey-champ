import { Router } from 'express';
import { s3Service } from '@surveychamp/backend-core';
import { v4 as uuidv4 } from 'uuid';

export const storageRouter = Router();

// Runner only needs read access (if even that directly, usually redirects)
// Uploads are handled by Builder API only.

// Redirect Endpoint for Permanent Access
// Captures the full path after /view/ as the key (e.g. "uploads/image.png")
storageRouter.get('/view/uploads/:key', async (req, res) => {
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
