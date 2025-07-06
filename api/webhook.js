module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Log de webhook data
    console.log('Webhook received:', req.body);
    
    // Hier kun je later logica toevoegen om je frontend te updaten
    // Bijvoorbeeld: stuur een notificatie naar je Framer website
    
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
