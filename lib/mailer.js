const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const options = require('../config');

var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = options.sibKey;


function sendMail(user, mail, link, templateId) {
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail = {
        to: [{
            email: mail,
            name: user
        }],
        templateId: templateId,
        params: {
            link: link,
        }
    };

    apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
        return true;
    }, function(error) {
        console.error(error);
        return false;
    });
}

function sendPasswordReset(user, mail, link) {
    return sendMail(user, mail, link, 4);
}

function sendMailConfirmation(user, mail, link) {
    return sendMail(user, mail, link, 1);
}

module.exports = { sendPasswordReset, sendMailConfirmation }
