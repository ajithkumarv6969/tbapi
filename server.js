const axios = require('axios');
const nodemailer = require('nodemailer');
// (Add the rest of the previous code here, same as in api/check.js)

// Run checks every 1 minute
setInterval(checkApiStatus, 60 * 1000);
