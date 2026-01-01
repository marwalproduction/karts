const { getAllPendingImages } = require('../github-storage');

// Admin API: Get all pending images
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pendingImages = await getAllPendingImages();
    res.json({ pendingImages });
  } catch (error) {
    console.error('Admin pending error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

