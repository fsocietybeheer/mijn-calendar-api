const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Laad environment variables
require('dotenv').config({ path: '.env.local' });

async function setupWebhook() {
  try {
    let serviceAccount;
    
    // Probeer eerst environment variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.log('📄 Gebruik environment variables...');
      serviceAccount = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      };
    } else {
      // Fallback naar JSON bestand
      console.log('📄 Probeer JSON bestand...');
      const serviceAccountPath = path.join(__dirname, 'service-account.json');
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Geen service-account.json gevonden EN geen environment variables!');
        console.log('📝 Oplossing 1: Plaats service-account.json in je project root');
        console.log('📝 Oplossing 2: Voeg environment variables toe aan .env.local');
        return;
      }

      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }

    // Validatie
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('❌ Ongeldige service account credentials');
      console.log('🔍 Controleer of private_key en client_email aanwezig zijn');
      return;
    }

    console.log('✅ Service account geladen:', serviceAccount.client_email);

    // JWT Client aanmaken met key parameter
    const jwtClient = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    console.log('🔐 Authenticatie...');
    await jwtClient.authorize();
    console.log('✅ Authenticatie succesvol');

    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    // Unieke channel ID genereren
    const channelId = 'calendar-webhook-' + Date.now();
    
    // Je Vercel URL - VERVANG DEZE MET JE EIGEN URL
    const webhookUrl = 'https://mijn-calendar-api-o3f5.vercel.app/api/webhook';

    console.log('📡 Webhook instellen...');
    console.log('🔗 Webhook URL:', webhookUrl);

    // Watch request
    const watchResponse = await calendar.events.watch({
      calendarId: 'primary',
      resource: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        params: {
          ttl: '3600' // 1 uur
        }
      }
    });

    console.log('🎉 Webhook setup succesvol!');
    console.log('📊 Details:');
    console.log('   Channel ID:', watchResponse.data.id);
    console.log('   Resource ID:', watchResponse.data.resourceId);
    console.log('   Expiration:', new Date(parseInt(watchResponse.data.expiration)));

    // Bewaar informatie voor later gebruik
    const webhookInfo = {
      channelId: watchResponse.data.id,
      resourceId: watchResponse.data.resourceId,
      expiration: watchResponse.data.expiration,
      setupTime: new Date().toISOString()
    };

    fs.writeFileSync('webhook-info.json', JSON.stringify(webhookInfo, null, 2));
    console.log('💾 Webhook info opgeslagen in webhook-info.json');

  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    
    if (error.message.includes('Calendar usage limits exceeded')) {
      console.log('⚠️  Te veel requests. Wacht even en probeer opnieuw.');
    } else if (error.message.includes('Forbidden')) {
      console.log('⚠️  Geen toegang tot calendar. Zorg ervoor dat:');
      console.log('   1. Je service account toegang heeft tot je calendar');
      console.log('   2. Je Calendar API is ingeschakeld');
    } else if (error.message.includes('Bad Request')) {
      console.log('⚠️  Ongeldige webhook URL. Controleer je Vercel URL.');
    }
  }
}

setupWebhook();