const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const API_URLS = [
    'https://webapi.toyotabharat.com/1.0/api/businessstates',
    'https://webapi.toyotabharat.com/1.0/api/pricestates',
    'https://webapi.toyotabharat.com/1.0/api/price/models'
];
const LOG_FILE = path.join(__dirname, '..', 'logs', 'api-monitor.log');
const EMAIL_RECIPIENTS = ['ajith.kumar@renaissanceind.com'];
const EMAIL_CC = ['ajithkumarv6969@gmail.com'];
const EMAIL_SENDER = 'ajithkulalar2002@gmail.com';
const EMAIL_PASSWORD = 'qkuz advj ypji xkdd';

let lastOkEmailSentAt = 0;
const OK_EMAIL_INTERVAL = 30 * 60 * 1000;  // 30 minutes

if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_SENDER,
        pass: EMAIL_PASSWORD,
    },
});

const successEmailTemplate = (recipientName, statusCode, apiUrl) => {
    return `
    <p>Dear ${recipientName},</p>
    <p style="color:green;">The Toyota API is <strong>working fine</strong>.</p>
    <p><strong>Status Code:</strong> ${statusCode}</p>
    <p>API URL: <a href="${apiUrl}">${apiUrl}</a></p>
    <br>
    <p><em><strong>Regards,<br>Ajithkumar V<br>Renaissance Technologies Pvt Ltd.<br>+91-86185-16969</strong></em></p>
    `;
};

const errorEmailTemplate = (recipientName, statusCode, errorMessage, apiUrl) => {
    return `
    <p>Dear ${recipientName},</p>
    <p style="color:red;">The Toyota API is <strong>not responding</strong>.</p>
    <p><strong>Status Code:</strong> ${statusCode}</p>
    <p><strong>Error:</strong> ${errorMessage}</p>
    <p>API URL: <a href="${apiUrl}">${apiUrl}</a></p>
    <br>
    <p><em><strong>Regards,<br>Ajithkumar V<br>Renaissance Technologies Pvt Ltd.<br>+91-86185-16969</strong></em></p>
    `;
};

async function sendEmail(subject, html) {
    const mailOptions = {
        from: EMAIL_SENDER,
        to: EMAIL_RECIPIENTS,
        cc: EMAIL_CC,
        subject,
        html,
        attachments: [
            {
                filename: 'api-monitor.log',
                path: LOG_FILE,
            },
        ],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent: ${info.response}`);
        logToFile(`📧 Email sent: ${subject}`);
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        logToFile(`❌ Email send failed: ${error.message}`);
    }
}

async function checkApiStatus() {
    for (const API_URL of API_URLS) {
        try {
            const response = await axios.post(API_URL, null, {
                headers: {
                    "Referer": "https://www.toyotabharat.com/",
                    "Cookie": "sl-session=NvqKB0hYLWgLESwJggidQA==", // Replace with actual cookie
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/xml",
                    "Accept": "application/xml, text/xml, */*; q=0.01",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "User-Agent": "PostmanRuntime/7.43.4"
                }
            });

            const status = response.status;
            const now = Date.now();
            console.log(`✅ API ${API_URL} is working. Status: ${status}`);
            logToFile(`✅ API ${API_URL} is working. Status: ${status}`);

            if (now - lastOkEmailSentAt > OK_EMAIL_INTERVAL) {
                await sendEmail('✅ Toyota API is working fine', successEmailTemplate('Ajith', status, API_URL));
                lastOkEmailSentAt = now;
            }

        } catch (error) {
            const status = error.response?.status || 'No Response';
            const message = error.message;
            console.log(`❌ API ${API_URL} check failed. Status: ${status}, Error: ${message}`);
            logToFile(`❌ API ${API_URL} check failed. Status: ${status}, Error: ${message}`);

            await sendEmail('🚨 Toyota API is DOWN', errorEmailTemplate('Ajith', status, message, API_URL));
        }
    }
}

// Vercel handler for API requests
module.exports = async (req, res) => {
    if (req.method === 'GET') {
        await checkApiStatus();
        res.status(200).json({ message: 'API status checked successfully' });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
