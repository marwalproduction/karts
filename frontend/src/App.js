import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Wait for Puter.ai to load
const waitForPuter = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.puter) {
      resolve(window.puter);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkPuter = setInterval(() => {
      attempts++;
      if (window.puter) {
        clearInterval(checkPuter);
        resolve(window.puter);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkPuter);
        reject(new Error('Puter.ai failed to load. Please refresh the page.'));
      }
    }, 100);
  });
};

// Vendor Card Component for displaying structured vendor listings
function VendorCard({ vendor, formatDate }) {
  return (
    <div
      style={{
        background: '#222',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '15px',
        textAlign: 'left',
        border: '1px solid #333'
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#4CAF50', fontSize: '1.2em' }}>
        {vendor.heading || 'Vendor'}
      </h3>
      
      {vendor.description && (
        <p style={{ color: '#ccc', margin: '10px 0', lineHeight: '1.5' }}>
          {vendor.description}
        </p>
      )}

      {vendor.extractedText && (
        <div style={{ marginTop: '12px', padding: '10px', background: '#111', borderRadius: '5px' }}>
          <div style={{ fontSize: '0.85em', color: '#aaa', marginBottom: '5px' }}>Details:</div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#fff', fontSize: '0.9em' }}>
            {vendor.extractedText}
          </pre>
        </div>
      )}

      {vendor.extraInfo && (
        <div style={{ marginTop: '12px', fontSize: '0.9em' }}>
          {vendor.extraInfo.items && vendor.extraInfo.items.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ color: '#aaa' }}>Items: </span>
              <span style={{ color: '#fff' }}>{vendor.extraInfo.items.join(', ')}</span>
            </div>
          )}
          {vendor.extraInfo.prices && vendor.extraInfo.prices.length > 0 && (
            <div style={{ marginTop: '8px', color: '#4CAF50' }}>
              <span style={{ color: '#aaa' }}>Prices: </span>
              {vendor.extraInfo.prices.join(', ')}
            </div>
          )}
          {vendor.extraInfo.hours && (
            <div style={{ marginTop: '8px', color: '#fff' }}>
              <span style={{ color: '#aaa' }}>Hours: </span>
              {vendor.extraInfo.hours}
            </div>
          )}
          {vendor.extraInfo.contact && (
            <div style={{ marginTop: '8px', color: '#fff' }}>
              <span style={{ color: '#aaa' }}>Contact: </span>
              {vendor.extraInfo.contact}
            </div>
          )}
          {vendor.extraInfo.features && vendor.extraInfo.features.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ color: '#aaa' }}>Features: </span>
              <span style={{ color: '#4CAF50' }}>{vendor.extraInfo.features.join(' • ')}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' }}>
        📍 Location: {vendor.location?.lat?.toFixed(4)}, {vendor.location?.lng?.toFixed(4)} • {formatDate(vendor.createdAt)}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'browse'
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [serverMsg, setServerMsg] = useState(null);
  const fileInputRef = useRef(null);

  // Browse state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyVendors, setNearbyVendors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || '';

  // Get user location on mount
  useEffect(() => {
    if (activeTab === 'browse' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          fetchNearbyVendors(location.lat, location.lng);
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    }
  }, [activeTab]);

  // Search vendors
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.vendors || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch nearby vendors
  const fetchNearbyVendors = async (lat, lng) => {
    setNearbyLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/nearby?lat=${lat}&lng=${lng}&radius=5000&limit=20`);
      const data = await response.json();
      setNearbyVendors(data.vendors || []);
    } catch (err) {
      console.error('Nearby vendors error:', err);
      setNearbyVendors([]);
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleCaptureAndSend = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setVendorData(null);
    setServerMsg(null);
    setLoadingProgress('Loading image...');
    setPreview(URL.createObjectURL(file));

    try {
      // Step 1: Wait for Puter.ai to load
      setLoadingProgress('Loading AI...');
      await waitForPuter();

      // Step 2: Create image URL for Puter.ai
      setLoadingProgress('Preparing image...');
      const imageUrl = URL.createObjectURL(file);

      // Step 3: Analyze image with Puter.ai (client-side)
      setLoadingProgress('Analyzing image with AI...');
      
      const prompt = `Analyze this image of a vendor, food cart, or business. Extract and structure the information as JSON with the following format:

{
  "heading": "A short, descriptive title (e.g., 'Taco Stand', 'Coffee Cart', 'Food Truck')",
  "description": "A brief AI-generated description of what this vendor offers, their specialties, or notable features (2-3 sentences)",
  "extractedText": "All visible text from signs, menus, or labels (preserve line breaks)",
  "extraInfo": {
    "items": ["List of items/products if visible"],
    "prices": ["Prices if visible"],
    "hours": "Operating hours if visible",
    "contact": "Phone number or contact info if visible",
    "features": ["Notable features like 'outdoor seating', 'cash only', etc."]
  }
}

Be concise but informative. If information is not visible, use null or empty arrays. Return ONLY valid JSON, no markdown formatting.`;

      // Check if Puter.ai is authenticated (might be required)
      let puterAuthError = null;
      try {
        // Try to check authentication status
        if (window.puter.auth && typeof window.puter.auth.getUser === 'function') {
          try {
            await window.puter.auth.getUser();
          } catch (authErr) {
            console.warn('Puter.ai auth check:', authErr);
            puterAuthError = 'Puter.ai may require authentication. Please check if you need to sign in.';
          }
        }
      } catch (e) {
        // Auth check not available, continue anyway
      }

      let puterResponse;
      const modelsToTry = ["gpt-4o-mini", "gpt-4o", "gpt-4", "claude-3-haiku", "gpt-3.5-turbo"];
      let lastError = null;
      
      for (const model of modelsToTry) {
        try {
          console.log(`Trying model: ${model}`);
          puterResponse = await window.puter.ai.chat(
            prompt,
            imageUrl,
            { model: model }
          );
          console.log(`Success with model: ${model}`);
          break; // Success, exit loop
        } catch (modelError) {
          console.log(`Model ${model} failed:`, modelError.message);
          lastError = modelError;
          // If error mentions auth/401, stop trying other models
          if (modelError.message && (modelError.message.includes('401') || modelError.message.includes('auth') || modelError.message.includes('unauthorized'))) {
            puterAuthError = 'Puter.ai authentication required. Please sign in to Puter.ai.';
            break;
          }
          continue; // Try next model
        }
      }
      
      if (!puterResponse) {
        URL.revokeObjectURL(imageUrl);
        const errorMsg = puterAuthError || 
          `All Puter.ai models failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
          `This might be due to authentication requirements. Please check Puter.ai documentation or try refreshing the page.`;
        throw new Error(errorMsg);
      }

      // Clean up object URL
      URL.revokeObjectURL(imageUrl);

      // Parse Puter.ai response
      let puterText = typeof puterResponse === 'string' ? puterResponse : puterResponse.text || JSON.stringify(puterResponse);
      const cleanedText = puterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let analyzeData;
      try {
        analyzeData = JSON.parse(cleanedText);
      } catch (parseError) {
        // If JSON parsing fails, create structured data from text
        console.error('Failed to parse Puter.ai response as JSON:', cleanedText);
        analyzeData = {
          heading: 'Vendor',
          description: cleanedText.substring(0, 200) || 'A vendor or business',
          extractedText: cleanedText,
          extraInfo: {
            items: [],
            prices: [],
            hours: null,
            contact: null,
            features: []
          }
        };
      }

      setVendorData(analyzeData);
      setLoadingProgress('Getting location...');

      // Step 3: Get location
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setLoading(false);
        setLoadingProgress('');
        return;
      }

      // Set a timeout for geolocation (10 seconds)
      const geoTimeout = setTimeout(() => {
        setError('Location request timed out. Please enable location access and try again.');
        setLoading(false);
        setLoadingProgress('');
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(geoTimeout);
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // Step 4: Send structured vendor data to server
          setLoadingProgress('Saving vendor...');
          
          try {
            const uploadUrl = `${apiUrl}/api/upload`;
            
            const response = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                heading: analyzeData.heading,
                description: analyzeData.description,
                extractedText: analyzeData.extractedText,
                extraInfo: analyzeData.extraInfo,
                lat: location.lat,
                lng: location.lng,
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: `Server error: ${response.status} ${response.statusText}` };
              }
              throw new Error(errorData.error || 'Server error');
            }
            
            const data = await response.json();
            setServerMsg(data.message || 'Vendor info saved successfully');
            setLoading(false);
            setLoadingProgress('');
            
            // Refresh nearby vendors if on browse tab
            if (activeTab === 'browse' && userLocation) {
              fetchNearbyVendors(userLocation.lat, userLocation.lng);
            }
          } catch (err) {
            setError(err.message || 'Failed to save vendor');
            setLoading(false);
            setLoadingProgress('');
          }
        },
        (err) => {
          clearTimeout(geoTimeout);
          setError('Could not retrieve location. Please enable location access.');
          setLoading(false);
          setLoadingProgress('');
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 60000
        }
      );
    } catch (err) {
      setError(err.message || 'Image analysis failed');
      setLoading(false);
      setLoadingProgress('');
    }

    // Reset file input
    e.target.value = '';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{ marginBottom: '20px' }}>Karts Vendor App</h1>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: activeTab === 'add' ? '#4CAF50' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ➕ Add Vendor
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: activeTab === 'browse' ? '#4CAF50' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔍 Browse
          </button>
        </div>

        {/* Add Vendor Tab */}
        {activeTab === 'add' && (
          <div>
            <h2>Add Vendor</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              style={{ display: 'none' }}
            />
            <button onClick={handleCaptureAndSend} disabled={loading} style={{ padding: '15px 30px', fontSize: '18px', marginTop: '20px' }}>
              {loading ? (loadingProgress || 'Processing...') : '📷 Capture & Send'}
            </button>
            {preview && (
              <div style={{ margin: '1em 0' }}>
                <img src={preview} alt="preview" style={{ width: 220, borderRadius: 8 }} />
              </div>
            )}
            {vendorData && (
              <div style={{ marginTop: '1em', background: '#222', padding: '20px', borderRadius: 8, maxWidth: '90%', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, color: '#4CAF50' }}>{vendorData.heading}</h3>
                {vendorData.description && (
                  <p style={{ color: '#ccc', margin: '10px 0' }}>{vendorData.description}</p>
                )}
                {vendorData.extractedText && (
                  <div style={{ marginTop: '15px' }}>
                    <b style={{ color: '#aaa' }}>Extracted Text:</b>
                    <pre style={{ whiteSpace: 'pre-wrap', color: '#fff', marginTop: '5px' }}>{vendorData.extractedText}</pre>
                  </div>
                )}
                {vendorData.extraInfo && (
                  <div style={{ marginTop: '15px', fontSize: '0.9em' }}>
                    {vendorData.extraInfo.items && vendorData.extraInfo.items.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <b style={{ color: '#aaa' }}>Items:</b>
                        <ul style={{ color: '#fff', margin: '5px 0', paddingLeft: '20px' }}>
                          {vendorData.extraInfo.items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {vendorData.extraInfo.prices && vendorData.extraInfo.prices.length > 0 && (
                      <div style={{ marginTop: '10px', color: '#4CAF50' }}>
                        <b>Prices:</b> {vendorData.extraInfo.prices.join(', ')}
                      </div>
                    )}
                    {vendorData.extraInfo.hours && (
                      <div style={{ marginTop: '10px', color: '#fff' }}>
                        <b>Hours:</b> {vendorData.extraInfo.hours}
                      </div>
                    )}
                    {vendorData.extraInfo.contact && (
                      <div style={{ marginTop: '10px', color: '#fff' }}>
                        <b>Contact:</b> {vendorData.extraInfo.contact}
                      </div>
                    )}
                    {vendorData.extraInfo.features && vendorData.extraInfo.features.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <b style={{ color: '#aaa' }}>Features:</b>
                        <div style={{ color: '#4CAF50', marginTop: '5px' }}>
                          {vendorData.extraInfo.features.join(' • ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {serverMsg && <div style={{ color: 'lightgreen', fontSize: '0.95em', marginTop: '15px' }}>{serverMsg}</div>}
              </div>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div style={{ width: '100%', maxWidth: '600px' }}>
            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Search vendors..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '5px',
                  border: '1px solid #555',
                  backgroundColor: '#222',
                  color: 'white'
                }}
              />
              {searchLoading && <p style={{ marginTop: '10px' }}>Searching...</p>}
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Search Results</h3>
                {searchResults.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} formatDate={formatDate} />
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <p style={{ color: '#aaa' }}>No vendors found matching your search.</p>
            )}

            {/* Latest Nearby Vendors */}
            <div>
              <h3>📍 Latest Nearby Your Area</h3>
              {nearbyLoading ? (
                <p>Loading nearby vendors...</p>
              ) : nearbyVendors.length > 0 ? (
                nearbyVendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} formatDate={formatDate} />
                ))
              ) : (
                <p style={{ color: '#aaa' }}>No nearby vendors found. Be the first to add one!</p>
              )}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
