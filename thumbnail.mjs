import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createUniqueId, httpsPost } from './utils.mjs';


export async function createThumbnail(s3, bucket, key, fileExtension) {
    try {
        const imageObject = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const imageBuffer = Buffer.from(await imageObject.Body.transformToByteArray())
        const options = {
            hostname: 'api.tinify.com',
            path: '/shrink',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`api:${process.env.TINYPNG_API_KEY}`).toString('base64')}`
            }
        };
        // Compress the image
        const { response: tinypngRes, body: tinypngResBody } = await httpsPost(options, imageBuffer);
        console.log(tinypngResBody.toString())
        console.log(tinypngRes.headers)
        // Use the Location header to get the api endpoint to resize the image
        const requestUrl = new URL(tinypngRes.headers.location).pathname;
        // Get the resized image
        const { body: resizedImageBuffer } = await httpsPost({ ...options, path: requestUrl, headers: { ...options.headers, 'content-type': 'application/json' } }, JSON.stringify({ resize: { method: 'fit', width: 200, height: 200 } }));
        // Upload the resized image to S3
        const thumbnailKey = `thumbnails/${key.replace('uploads/', '').split('.')[0]}_${createUniqueId()}_thumbnail.${fileExtension}`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbnailKey, Body: resizedImageBuffer }));
        // Return the key of the thumbnail for future use
        return thumbnailKey;
    } catch (err) {
        console.error("Error creating thumbnail:", err);
        throw err;
    }
}