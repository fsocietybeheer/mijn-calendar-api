module.exports = async function handler(req, res) {
    res.json({ message: "API werkt!", time: new Date().toISOString() });
};
