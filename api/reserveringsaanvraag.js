const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
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

  // Vul hieronder je eigen Gmail-adres en app-wachtwoord in
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'casalucyjavea@gmail.com', // <-- Vervang door je eigen Gmail-adres
      pass: 'mihd eouf asue tpno',       // <-- Vervang door je Gmail app-wachtwoord
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
    res.status(500).json({ error: 'E-mail verzenden mislukt' });
  }
}; 