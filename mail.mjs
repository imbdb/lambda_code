import { SendEmailCommand } from '@aws-sdk/client-ses';
import { text } from 'stream/consumers';

export function composeEmail(objectDetails) {
    let htmlMessage = "";
    let textMessage = `
    S3 Objects Uploaded Today

    -------------------------
    URI | Name | Size | Type
    -------------------------
    `
    objectDetails.forEach(obj => {
        htmlMessage += `
        <tr>
            <td>${obj.uri.S}</td>
            <td>${obj.name.S}</td>
            <td>${obj.size.N} bytes</td>
            <td>${obj.type.S}</td>
        </tr>
        `;
        textMessage += `
        ${obj.uri.S} | ${obj.name.S} | ${obj.size.N} bytes | ${obj.type.S}
        `;
    });
    let template = fs.readFileSync('./email-template.html', 'utf8');
    template = template.replace('{{REPORT_DATA}}', htmlMessage);
    return { html: template, text: textMessage };
}

export async function sendEmail(ses, message, subject, toAddresses, fromAddress) {
    const params = {
        Destination: {
            ToAddresses: toAddresses
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: message.html,
                },
                Text: {
                    Charset: "UTF-8",
                    Data: message.text,
                },
            },
            Subject: { Data: subject }
        },
        Source: fromAddress
    };

    try {
        const result = await ses.send(new SendEmailCommand(params));
        console.log("Email sent successfully:", result);
    } catch (err) {
        console.error("Error sending email:", err);
        throw err;
    }
}