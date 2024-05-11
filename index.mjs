import { S3Client, HeadObjectCommand, } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { REGION, REPORT_EMAILS, SOURCE_EMAIL } from './config.mjs';
import { storeObjectDetails, retrieveObjectDetails } from './store.mjs';
import { createThumbnail } from './thumbnail.mjs';
import { composeEmail, sendEmail } from './mail.mjs';

const s3 = new S3Client({ region: REGION });
const ses = new SESClient({ region: REGION });
const dynamodb = new DynamoDBClient({ region: REGION });

export async function handler(event) {
    console.log("Processing event:", JSON.stringify(event, null, 2));
    // end of day report event
    if(event.source === 'aws.events' && event.resources[0] === 'EVENT_BRIDGE_RULE_ARN'){
        console.log('Processing event source', event.eventSource)
        await endOfDayHandler()
        return
    }
    // S3 file upload event
    else if(Array.isArray(event.Records) === true){
        for(const rec of event.Records){
            console.log('Processing event source', rec.eventSource)
            console.log('Processing event name', rec.eventName)
            switch (rec.eventSource) {
                case 'aws:s3':
                    if(rec.eventName === 'ObjectCreated:Put'){
                        await handleFileUpload(rec)
                    } else {
                        console.error("Invalid event name")
                    }
                    break;
                case 'aws.events':

                default:
                    console.error("Invalid event source")
            }
        }
    } else {
        console.error("Invalid trigger");
    }
}

export async function handleFileUpload(record) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log("Processing file:", key)
    try {
        const objMetadata = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const objUri = `s3://${bucket}/${key}`;
        const objName = key.split('/').pop();
        const objSize = objMetadata.ContentLength;
        const objType = objMetadata.ContentType;
        // Currently only supporting jpeg and png images
        if (objType === 'image/jpeg' || objType === 'image/png') {
            console.log("Image file detected, Creating thumbnail");
            const extension = objType === 'image/jpeg' ? 'jpg' : 'png';
            const thumbnailKey = await createThumbnail(s3, bucket, key, extension);
            await storeObjectDetails(dynamodb, bucket, key, objUri, objName, objSize, objType, thumbnailKey);
        } else {
            await storeObjectDetails(dynamodb, bucket, key, objUri, objName, objSize, objType, false);
        }
    } catch (err) {
        console.error("Error:", err);
        throw err;
    }
}

export async function endOfDayHandler() {
    try {
        const objectDetails = await retrieveObjectDetails(dynamodb);
        const message = composeEmail(objectDetails);
        const subject = `S3 Objects Uploaded report [${new Date().toISOString().split('T')[0]}`;
        await sendEmail(ses, message, subject, REPORT_EMAILS, SOURCE_EMAIL);
    } catch (err) {
        console.error("Error:", err);
        throw err;
    }
}
