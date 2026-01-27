import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Service {
    private s3: S3Client;
    private bucket: string;

    constructor() {
        // In Monorepo, these should be in .env of builder-api
        const region = process.env.AWS_REGION || "us-east-1";
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        this.bucket = process.env.AWS_BUCKET_NAME || "";

        this.s3 = new S3Client({
            region,
            credentials: {
                accessKeyId: accessKeyId || "",
                secretAccessKey: secretAccessKey || ""
            }
        });
    }

    /**
     * Generates a pre-signed URL for downloading/viewing a file from S3.
     * @param key The file path/name in S3
     * @param expiresInSeconds Expiration time for the URL (default 300s / 5m)
     */
    async generatePresignedGetUrl(key: string, expiresInSeconds = 300) {
        if (!this.bucket) throw new Error("AWS Bucket not configured");

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
    }

    /**
     * Generates a pre-signed URL for uploading a file directly to S3 from the client.
     * @param key The file path/name in S3 (e.g., "uploads/my-image.png")
     * @param contentType The MIME type of the file
     * @param expiresInSeconds Expiration time for the URL (default 300s / 5m)
     */
    async generateUploadUrl(key: string, contentType: string, expiresInSeconds = 300) {
        if (!this.bucket) throw new Error("AWS Bucket not configured");

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType
        });

        const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
        
        // Generate a pre-signed GET URL for immediate preview (valid for 5 mins by default)
        const publicUrl = await this.generatePresignedGetUrl(key, expiresInSeconds);

        return { uploadUrl, publicUrl };
    }
}

export const s3Service = new S3Service();
