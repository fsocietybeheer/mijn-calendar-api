const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // Zet CORS headers altijd bovenaan
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, description, dates } = req.body;
  if (!name || !email || !dates) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // LET OP: GEEN SPATIE aan het eind van je wachtwoord!
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'casalucyjavea@gmail.com',
      pass: 'mihd eouf asue tpno', // <-- zonder spatie aan het eind!
    },
  });

  const mailOptions = {
    from: 'noreply@casalucy.nl',
    to: 'casalucyjavea@gmail.com',
    subject: 'Nieuwe reserveringsaanvraag',
    text: `Naam: ${name}\nEmail: ${email}\nData: ${dates}\nOpmerkingen: ${description || ''}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error(error); // Log de echte fout in Vercel logs!
    res.status(500).json({ error: 'E-mail verzenden mislukt' });
  }
}; 