import { google } from 'googleapis';

export default async function handler(req, res) {
  // Haal credentials uit environment variable
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = 'JOUW_SHEET_ID_HIER'; // <-- Vervang door je eigen sheet ID
  const range = 'Sheet1!A:B'; // <-- Pas aan als je sheet anders heet

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(200).json({ prices: [] });
    }

    // Vind de indexen van de kolommen "Datum" en "Prijs"
    const header = rows[0];
    const dateIdx = header.findIndex(h => h.toLowerCase().includes('datum'));
    const priceIdx = header.findIndex(h => h.toLowerCase().includes('prijs'));

    if (dateIdx === -1 || priceIdx === -1) {
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

    res.status(200).json({ prices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}