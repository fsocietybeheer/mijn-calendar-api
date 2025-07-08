const { google } = require('googleapis');

// Service account credentials (uit je JSON file)
const serviceAccount = {
  type: "service_account",
  project_id: "jouw-project-id",
  private_key_id: "jouw-private-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  client_email: "jouw-service-account@jouw-project.iam.gserviceaccount.com",
  client_id: "jouw-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/jouw-service-account%40jouw-project.iam.gserviceaccount.com"
};

async function setupWebhook() {
  try {
    // Authenticatie
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );

    await jwtClient.authorize();

    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Watch request
    const watchResponse = await calendar.events.watch({
      calendarId: 'primary', // of een specifieke calendar ID
      resource: {
        id: 'my-calendar-webhook-' + Date.now(), // Unieke ID
        type: 'web_hook',
        address: 'https://jouw-vercel-app.vercel.app/api/webhook',
        // Optioneel: filters
        // params: {
        //   ttl: '3600' // Time to live in seconds
        // }
      }
    });

    console.log('Webhook setup successful:', watchResponse.data);
    
    // Bewaar deze informatie voor later gebruik
    console.log('Channel ID:', watchResponse.data.id);
    console.log('Resource ID:', watchResponse.data.resourceId);
    console.log('Expiration:', new Date(parseInt(watchResponse.data.expiration)));

  } catch (error) {
    console.error('Error setting up webhook:', error);
  }
}

setupWebhook();