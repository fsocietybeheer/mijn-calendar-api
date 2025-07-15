import { google } from 'googleapis';

export default async function handler(req, res) {
  console.log("prices.js endpoint aangeroepen");

  try {
    // Check environment variables
    const requiredEnvVars = {
      email: process.env.GOOGLE_SHEETS_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEET_ID
    };

    // Debug log (verwijder later)
    console.log('Environment check:', {
      hasEmail: !!requiredEnvVars.email,
      hasPrivateKey: !!requiredEnvVars.privateKey,
      hasSheetId: !!requiredEnvVars.sheetId,
      privateKeyLength: requiredEnvVars.privateKey?.length,
      privateKeyStart: requiredEnvVars.privateKey?.substring(0, 50)
    });

    if (!requiredEnvVars.email || !requiredEnvVars.privateKey || !requiredEnvVars.sheetId) {
      throw new Error('Missing required environment variables');
    }

    // Private key formatting - verschillende methoden proberen
    let privateKey = requiredEnvVars.privateKey;
    
    // Method 1: Replace escaped newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Method 2: Als het nog steeds niet werkt, probeer direct JSON parse
    if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      try {
        privateKey = JSON.parse(`"${privateKey}"`);
      } catch (e) {
        console.log('JSON parse failed, using as-is');
      }
    }

    console.log('Private key processed:', {
      startsCorrectly: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsCorrectly: privateKey.endsWith('-----END PRIVATE KEY-----'),
      hasNewlines: privateKey.includes('\n'),
      length: privateKey.length
    });

    // Google Auth setup
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        client_email: requiredEnvVars.email,
        private_key: privateKey,
        project_id: "mijn-calendar-api-465208"
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('Auth created, testing connection...');
    
    // Test the auth first
    const authClient = await auth.getClient();
    console.log('Auth client obtained successfully');

    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'Sheet1!A:B';

    console.log('Attempting to read sheet:', requiredEnvVars.sheetId);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: requiredEnvVars.sheetId,
      range,
    });

    console.log('Sheet read successfully');

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log("Geen of te weinig rijen gevonden in de sheet");
      return res.status(200).json({ prices: [] });
    }

    // Process data (rest van je code blijft hetzelfde)
    const header = rows[0];
    const dateIdx = header.findIndex(h => h.toLowerCase().includes('datum'));
    const priceIdx = header.findIndex(h => h.toLowerCase().includes('prijs'));

    if (dateIdx === -1 || priceIdx === -1) {
      console.error("Sheet mist kolommen 'Datum' of 'Prijs'");
      return res.status(400).json({ error: "Sheet mist kolommen 'Datum' of 'Prijs'" });
    }

    const prices = rows.slice(1).map(row => {
      const rawDate = row[dateIdx];
      const price = row[priceIdx];

      let date = rawDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [day, month, year] = rawDate.split('-');
        date = `${year}-${month}-${day}`;
      }

      return {
        date,
        price: Number(price),
      };
    });

    console.log("Aantal prijzen gevonden:", prices.length);
    res.status(200).json({ prices });
    
  } catch (err) {
    console.error("API ERROR:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      opensslErrorStack: err.opensslErrorStack
    });
    
    res.status(500).json({ 
      error: err.message,
      code: err.code,
      opensslErrorStack: err.opensslErrorStack 
    });
  }
}
