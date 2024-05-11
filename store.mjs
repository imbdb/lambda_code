import { PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { createUniqueId } from './utils.mjs';

function getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}


export async function storeObjectDetails(dynamodb, bucket, key, objUri, objName, objSize, objType, thumbnailKey) {
    const params = {
        TableName: 's3-objects',
        Item: {
            id: { S: createUniqueId() },
            timestamp: { N: Date.now().toString() },
            bucket: { S: bucket },
            key: { S: key },
            uri: { S: objUri },
            name: { S: objName },
            size: { N: objSize.toString() },
            type: { S: objType }
        }
    };
    if(thumbnailKey){
        params.Item.thumbnailKey = { S: thumbnailKey};
    }

    try {
        await dynamodb.send(new PutItemCommand(params));
    } catch (err) {
        console.error("Error storing object details:", err);
        throw err;
    }
}

export async function retrieveObjectDetails(dynamodb) {
    const params = {
        TableName: 's3-objects',
        ProjectionExpression: 'uri, #name, #size, #type',
        FilterExpression: 'attribute_not_exists(deleted) AND #timestamp BETWEEN :start AND :end',
        ExpressionAttributeNames: {
            '#timestamp': 'timestamp',
            '#name': 'name',
            '#size': 'size',
            '#type': 'type'
        },
        ExpressionAttributeValues: {
            ':start': { N: getStartOfDay().toString() },
            ':end': { N: Date.now().toString() }
        }
    };

    try {
        const data = await dynamodb.send(new ScanCommand(params));
        return data.Items;
    } catch (err) {
        console.error("Error retrieving object details:", err);
        throw err;
    }
}