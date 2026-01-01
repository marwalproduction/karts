const { Octokit } = require('@octokit/rest');

let octokit = null;

function getOctokit() {
  if (!octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

const OWNER = process.env.GITHUB_OWNER || 'marwalproduction';
const REPO = process.env.GITHUB_REPO || 'karts';
const DATA_PATH = 'vendor-data'; // Directory in repo to store vendor files
const PENDING_PATH = 'pending-images'; // Directory for pending images

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

// Get all vendors from GitHub
async function getAllVendors() {
  try {
    const octokit = getOctokit();
    
    // Try to get the directory contents
    let files = [];
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: DATA_PATH,
      });
      
      if (Array.isArray(data)) {
        files = data.filter(item => item.type === 'file' && item.name.endsWith('.json'));
      }
    } catch (error) {
      // Directory doesn't exist yet, return empty array
      if (error.status === 404) {
        return [];
      }
      throw error;
    }

    // Fetch all vendor files
    const vendors = [];
    for (const file of files) {
      try {
        const { data } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path,
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const vendor = JSON.parse(content);
        vendors.push(vendor);
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
      }
    }

    return vendors;
  } catch (error) {
    console.error('Error fetching vendors from GitHub:', error);
    throw error;
  }
}

// Save a vendor to GitHub
async function saveVendor(vendorData) {
  try {
    const octokit = getOctokit();
    const vendorId = `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${DATA_PATH}/${vendorId}.json`;
    
    const vendor = {
      id: vendorId,
      heading: vendorData.heading || 'Vendor',
      description: vendorData.description || '',
      extractedText: vendorData.extractedText || '',
      extraInfo: vendorData.extraInfo || {
        items: [],
        prices: [],
        hours: null,
        contact: null,
        features: []
      },
      location: {
        lat: parseFloat(vendorData.lat),
        lng: parseFloat(vendorData.lng)
      },
      createdAt: new Date().toISOString()
    };

    const content = JSON.stringify(vendor, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');

    // Check if directory exists, create if not
    try {
      await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: DATA_PATH,
      });
    } catch (error) {
      if (error.status === 404) {
        // Create directory by creating a .gitkeep file
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: `${DATA_PATH}/.gitkeep`,
            message: 'Create vendor data directory',
            content: Buffer.from('').toString('base64'),
          });
        } catch (createError) {
          console.error('Error creating directory:', createError);
          // If we can't create directory, try to create the file directly anyway
        }
      } else {
        // Re-throw if it's not a 404
        throw error;
      }
    }

    // Create or update the vendor file with retry logic for SHA conflicts
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        // First, try to get the file to see if it exists and get its SHA
        let fileSha = null;
        try {
          const existingFile = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: filename,
          });
          
          if (existingFile.data && existingFile.data.sha) {
            fileSha = existingFile.data.sha;
          }
        } catch (getError) {
          // File doesn't exist yet, that's fine - we'll create it
          if (getError.status !== 404) {
            throw getError;
          }
        }
        
        // Create or update the file
        const updateParams = {
          owner: OWNER,
          repo: REPO,
          path: filename,
          message: fileSha ? `Update vendor: ${vendorId}` : `Add vendor: ${vendorId}`,
          content: encodedContent,
        };
        
        // Only include SHA if file exists (for updates)
        if (fileSha) {
          updateParams.sha = fileSha;
        }
        
        await octokit.repos.createOrUpdateFileContents(updateParams);
        
        // Success - break out of retry loop
        break;
      } catch (error) {
        lastError = error;
        
        // Check if it's a SHA mismatch error (409 conflict)
        if (error.status === 409 || error.message.includes('but expected')) {
          console.log(`SHA conflict detected, retrying... (${retries} retries left)`);
          retries--;
          
          // Wait a bit before retrying (exponential backoff)
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)));
            continue;
          }
        }
        
        // For other errors, log and throw immediately
        console.error('GitHub API error details:', {
          status: error.status,
          message: error.message,
          owner: OWNER,
          repo: REPO,
          path: filename
        });
        
        if (error.status === 401) {
          throw new Error('GitHub authentication failed. Please check your GITHUB_TOKEN.');
        } else if (error.status === 403) {
          throw new Error('GitHub access forbidden. Check token permissions and repository access.');
        } else if (error.status === 404) {
          throw new Error(`Repository not found: ${OWNER}/${REPO}. Check GITHUB_OWNER and GITHUB_REPO environment variables.`);
        } else {
          throw new Error(`GitHub API error: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // If we exhausted retries, throw the last error
    if (retries === 0 && lastError) {
      throw new Error(`GitHub API error: Failed after retries. ${lastError.message || 'Unknown error'}`);
    }

    return vendor;
  } catch (error) {
    console.error('Error saving vendor to GitHub:', error);
    throw error;
  }
}

// Search vendors by text
async function searchVendors(query) {
  const vendors = await getAllVendors();
  const searchTerm = query.toLowerCase();
  
  return vendors.filter(vendor => {
    const searchableText = [
      vendor.heading,
      vendor.description,
      vendor.extractedText,
      ...(vendor.extraInfo?.items || []),
      ...(vendor.extraInfo?.features || [])
    ].join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm);
  }).sort((a, b) => {
    // Sort by relevance (how many times search term appears)
    const aText = [a.heading, a.description, a.extractedText].join(' ').toLowerCase();
    const bText = [b.heading, b.description, b.extractedText].join(' ').toLowerCase();
    const aCount = (aText.match(new RegExp(searchTerm, 'g')) || []).length;
    const bCount = (bText.match(new RegExp(searchTerm, 'g')) || []).length;
    return bCount - aCount;
  });
}

// Get nearby vendors
async function getNearbyVendors(lat, lng, radius = 5000) {
  const vendors = await getAllVendors();
  
  return vendors
    .map(vendor => ({
      ...vendor,
      distance: calculateDistance(lat, lng, vendor.location.lat, vendor.location.lng)
    }))
    .filter(vendor => vendor.distance <= radius)
    .sort((a, b) => {
      // Sort by date (newest first), then by distance
      const dateDiff = new Date(b.createdAt) - new Date(a.createdAt);
      if (Math.abs(dateDiff) > 60000) { // More than 1 minute difference
        return dateDiff;
      }
      return a.distance - b.distance;
    });
}

// Save pending image to GitHub
async function savePendingImage({ imageBuffer, lat, lng, timestamp }) {
  try {
    const octokit = getOctokit();
    const imageId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Save image file
    const imageBase64 = imageBuffer.toString('base64');
    const imageFilename = `${PENDING_PATH}/${imageId}.jpg`;
    
    // Check if directory exists, create if not
    try {
      await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: PENDING_PATH,
      });
    } catch (error) {
      if (error.status === 404) {
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: `${PENDING_PATH}/.gitkeep`,
            message: 'Create pending images directory',
            content: Buffer.from('').toString('base64'),
          });
        } catch (createError) {
          console.error('Error creating pending directory:', createError);
        }
      } else {
        throw error;
      }
    }

    // Save image
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: imageFilename,
      message: `Add pending image: ${imageId}`,
      content: imageBase64,
    });

    // Save metadata JSON
    const metadata = {
      id: imageId,
      imagePath: imageFilename,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      uploadedAt: timestamp || new Date().toISOString(),
      status: 'pending'
    };

    const metadataFilename = `${PENDING_PATH}/${imageId}.json`;
    const metadataContent = JSON.stringify(metadata, null, 2);
    const encodedMetadata = Buffer.from(metadataContent).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: metadataFilename,
      message: `Add pending image metadata: ${imageId}`,
      content: encodedMetadata,
    });

    return metadata;
  } catch (error) {
    console.error('Error saving pending image:', error);
    throw error;
  }
}

// Get all pending images
async function getAllPendingImages() {
  try {
    const octokit = getOctokit();
    let files = [];
    
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: PENDING_PATH,
      });
      
      if (Array.isArray(data)) {
        files = data.filter(item => item.type === 'file' && item.name.endsWith('.json'));
      }
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }

    const pendingImages = [];
    for (const file of files) {
      try {
        const { data } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path,
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const metadata = JSON.parse(content);
        
        // Get image URL from GitHub
        const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${metadata.imagePath}`;
        metadata.imageUrl = imageUrl;
        
        pendingImages.push(metadata);
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
      }
    }

    return pendingImages.sort((a, b) => 
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
  } catch (error) {
    console.error('Error fetching pending images:', error);
    throw error;
  }
}

// Get single pending image
async function getPendingImage(imageId) {
  const allPending = await getAllPendingImages();
  return allPending.find(img => img.id === imageId);
}

// Delete pending image
async function deletePendingImage(imageId) {
  try {
    const octokit = getOctokit();
    const metadata = await getPendingImage(imageId);
    
    if (!metadata) {
      throw new Error('Pending image not found');
    }

    // Delete image file
    try {
      const imageData = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: metadata.imagePath,
      });
      
      await octokit.repos.deleteFile({
        owner: OWNER,
        repo: REPO,
        path: metadata.imagePath,
        message: `Delete pending image: ${imageId}`,
        sha: imageData.data.sha
      });
    } catch (err) {
      console.warn('Error deleting image file:', err);
    }

    // Delete metadata file
    const metadataPath = `${PENDING_PATH}/${imageId}.json`;
    const metadataData = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: metadataPath,
    });

    await octokit.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path: metadataPath,
      message: `Delete pending image metadata: ${imageId}`,
      sha: metadataData.data.sha
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting pending image:', error);
    throw error;
  }
}

module.exports = {
  saveVendor,
  searchVendors,
  getNearbyVendors,
  getAllVendors,
  savePendingImage,
  getAllPendingImages,
  getPendingImage,
  deletePendingImage
};

