import crypto from 'crypto';
import https from 'https';

export function createUniqueId() {
  const time = Date.now();
  const randomPart = crypto.randomBytes(8).toString('hex');
  const uniqueId = `${time}-${randomPart}`;
  return uniqueId;
}

/**
 * 
 * @param {https.RequestOptions} options 
 * @param {any} data 
 * @returns {Promise<{ body: Buffer, response: https.IncomingMessage }>
 */
export function httpsPost(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve({ body: Buffer.concat(data), response: res }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}