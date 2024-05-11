import { createThumbnail } from "./thumbnail.mjs";
import fs from 'fs';

function testThumbnail() {
    let imageBuffer = fs.readFileSync('./image.jpg');
    const s3 = {
        send: () => {
            return {
                Body: imageBuffer
            }
        }
    }
    const bucket = 'my-bucket';
    const key = 'image.jpg';
    createThumbnail(s3, bucket, key);
}

testThumbnail();