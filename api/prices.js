import { google } from 'googleapis';

export default async function handler(req, res) {
  console.log("prices.js endpoint aangeroepen");

  try {
    // Check of alle benodigde environment variables aanwezig zijn
    if (!process.env.GOOGLE_SHEETS_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Gebruik je bestaande environment variables voor service account
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    // Handle verschillende private key formaten
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Zorg ervoor dat de key correct begint en eindigt
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format');
    }

    const credentials = {
      type: "service_account",
      client_email: process.env.GOOGLE_SHEETS_ACCOUNT_EMAIL,
      private_key: privateKey,
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Sheet1!A:B'; // Pas aan als je tabblad anders heet

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log("Geen of te weinig rijen gevonden in de sheet");
      return res.status(200).json({ prices: [] });
    }

    // Vind de indexen van de kolommen "Datum" en "Prijs"
    const header = rows[0];
    const dateIdx = header.findIndex(h => h.toLowerCase().includes('datum'));
    const priceIdx = header.findIndex(h => h.toLowerCase().includes('prijs'));

    if (dateIdx === -1 || priceIdx === -1) {
      console.error("Sheet mist kolommen 'Datum' of 'Prijs'");
      return res.status(400).json({ error: "Sheet mist kolommen 'Datum' of 'Prijs'" });
    }

    // Verwerk de rijen
    const prices = rows.slice(1).map(row => {
      const rawDate = row[dateIdx]; // bv. '12-07-2025'
      const price = row[priceIdx];

      // Zet om naar 'YYYY-MM-DD'
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
    console.error("API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
