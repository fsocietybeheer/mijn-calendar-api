import { google } from 'googleapis';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log("prices.js endpoint aangeroepen");

  try {
    // Check environment variables
    const requiredEnvVars = {
      email: process.env.GOOGLE_SHEETS_ACCOUNT_EMAIL,
      privateKeyBase64: process.env.GOOGLE_SHEETS_PRIVATE_KEY_BASE64,
      sheetId: process.env.GOOGLE_SHEET_ID
    };

    console.log('Environment check:', {
      hasEmail: !!requiredEnvVars.email,
      hasPrivateKeyBase64: !!requiredEnvVars.privateKeyBase64,
      hasSheetId: !!requiredEnvVars.sheetId,
      privateKeyBase64Length: requiredEnvVars.privateKeyBase64?.length
    });

    if (!requiredEnvVars.email || !requiredEnvVars.privateKeyBase64 || !requiredEnvVars.sheetId) {
      throw new Error('Missing required environment variables');
    }

    // Decode base64 private key
    const privateKey = Buffer.from(requiredEnvVars.privateKeyBase64, 'base64').toString('utf8');
    
    console.log('Private key decoded:', {
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
    
    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'prijzen!A:B';

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

    // Process data
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
      // Maak de datumconversie robuuster
      if (typeof rawDate === 'string') {
        const cleanedDate = rawDate.trim();
        const parts = cleanedDate.split('-');
        if (parts.length === 3) {
          // Zorg voor voorloopnullen
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          date = `${year}-${month}-${day}`;
        }
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
      code: err.code
    });
  }
}