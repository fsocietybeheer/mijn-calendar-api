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

  const { name, email, nationality, phone, persons, description, dates } = req.body;
  if (!name || !email || !nationality || !phone || !persons || persons < 1 || persons > 4 || !dates) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Format data naar dag-maand-jaar
  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }
  let formattedDates = dates;
  if (dates.includes('t/m')) {
    const [start, end] = dates.split(' t/m ');
    formattedDates = `${formatDate(start)} t/m ${formatDate(end)}`;
  } else {
    formattedDates = formatDate(dates);
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
    from: 'casalucyjavea@gmail.com',
    to: 'casalucyjavea@gmail.com',
    subject: 'Nieuwe reserveringsaanvraag',
    text: `Naam: ${name}\nEmail: ${email}\nNationaliteit: ${nationality}\nTelefoonnummer: ${phone}\nAantal personen: ${persons}\nData: ${formattedDates}\nOpmerkingen: ${description || ''}`,
  };

  try {
    await transporter.sendMail(mailOptions);

    // E-mail naar gast
    const guestMailOptions = {
      from: 'casalucyjavea@gmail.com',
      to: email,
      subject: 'Bevestiging reserveringsaanvraag Casa Lucy',
      text: `Beste ${name},\n\nBedankt voor je reserveringsaanvraag bij Casa Lucy. Wij nemen zo snel mogelijk contact met je op.\n\nGegevens aanvraag:\n- Data: ${formattedDates}\n- Aantal personen: ${persons}\n- Telefoonnummer: ${phone}\n- Nationaliteit: ${nationality}\n- Opmerkingen: ${description || '-'}\n\nMet vriendelijke groet,\nCasa Lucy`,
    }
    await transporter.sendMail(guestMailOptions)
    res.json({ success: true });
  } catch (error) {
    console.error(error); // Log de echte fout in Vercel logs!
    res.status(500).json({ error: 'E-mail verzenden mislukt' });
  }
}; 