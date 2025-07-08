const { google } = require('googleapis');

async function stopWebhook() {
  try {
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );

    await jwtClient.authorize();
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Stop de webhook
    await calendar.channels.stop({
      resource: {
        id: 'jouw-channel-id', // Van de setup response
        resourceId: 'jouw-resource-id' // Van de setup response
      }
    });

    console.log('Webhook stopped successfully');
  } catch (error) {
    console.error('Error stopping webhook:', error);
  }
}