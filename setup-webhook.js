const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function setupWebhook() {
  try {
    // Methode 1: Lees service account JSON bestand
    const serviceAccountPath = path.join(__dirname, 'service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ service-account.json niet gevonden!');
      console.log('📝 Zorg ervoor dat je het JSON bestand van Google Cloud Console hebt gedownload');
      console.log('📝 Plaats het bestand in je project root als "service-account.json"');
      return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Validatie
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('❌ Ongeldige service account credentials');
      return;
    }

    console.log('✅ Service account geladen:', serviceAccount.client_email);

    // JWT Client aanmaken
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/calendar']
    );

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