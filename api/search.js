const { searchVendors } = require('./github-storage');

// Search vendors by text
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
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;

    if (!query.trim()) {
      return res.json({ vendors: [] });
    }

    const vendors = await searchVendors(query);
    const limitedVendors = vendors.slice(0, limit);

    res.json({
      vendors: limitedVendors.map(v => ({
        id: v.id,
        heading: v.heading || 'Vendor',
        description: v.description || '',
        extractedText: v.extractedText || '',
        extraInfo: v.extraInfo || {},
        location: v.location,
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    
    // Handle rate limit gracefully - return empty or cached data
    if (error.status === 403 || (error.message && error.message.includes('rate limit'))) {
      console.warn('Rate limit hit during search, returning empty results');
      return res.json({ 
        vendors: [],
        warning: 'GitHub API rate limit exceeded. Please try again in a few minutes.'
      });
    }
    
    if (!process.env.GITHUB_TOKEN) {
      return res.json({ vendors: [] });
    }
    res.status(500).json({ 
      error: error.message || 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

