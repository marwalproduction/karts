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
        <p style={{ color: '#aaa', margin: '8px 0', lineHeight: '1.4', fontSize: '0.85em' }}>
          {vendor.description.length > 150 ? vendor.description.substring(0, 150) + '...' : vendor.description}
        </p>
      )}

      {/* Show items if available, but not the full extraInfo box */}
      {vendor.extraInfo?.items && vendor.extraInfo.items.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '0.9em' }}>
          <span style={{ color: '#aaa' }}>Items: </span>
          <span style={{ color: '#4CAF50' }}>{vendor.extraInfo.items.join(', ')}</span>
        </div>
      )}

      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📍 {formatDate(vendor.createdAt)}</span>
        {vendor.location?.lat && vendor.location?.lng && (
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${vendor.location.lat},${vendor.location.lng}`;
              window.open(url, '_blank');
            }}
            style={{
              padding: '5px 12px',
              fontSize: '0.85em',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🗺️ Get Directions
          </button>
        )}
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

  // Puter.ai authentication state
  const [puterAuthStatus, setPuterAuthStatus] = useState('checking'); // 'checking', 'signed-in', 'signed-out'
  const [puterUser, setPuterUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || '';

  // Check Puter.ai authentication status on mount
  useEffect(() => {
    const checkPuterAuth = async () => {
      try {
        await waitForPuter();
        
        if (window.puter && window.puter.auth) {
          const isSignedIn = window.puter.auth.isSignedIn();
          if (isSignedIn) {
            try {
              const user = window.puter.auth.getUser();
              setPuterUser(user);
              setPuterAuthStatus('signed-in');
            } catch (err) {
              console.error('Error getting user:', err);
              setPuterAuthStatus('signed-out');
            }
          } else {
            setPuterAuthStatus('signed-out');
          }
        } else {
          setPuterAuthStatus('signed-out');
        }
      } catch (err) {
        console.error('Puter.ai not available:', err);
        setPuterAuthStatus('signed-out');
      }
    };

    checkPuterAuth();
  }, []);

  // Sign in to Puter.ai
  const handlePuterSignIn = async () => {
    setAuthLoading(true);
    setError(null);
    
    try {
      await waitForPuter();
      
      if (!window.puter || !window.puter.auth) {
        throw new Error('Puter.ai is not available. Please refresh the page.');
      }

      const user = await window.puter.auth.signIn();
      setPuterUser(user);
      setPuterAuthStatus('signed-in');
      setError(null);
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(`Sign-in failed: ${err.message || 'Unknown error'}`);
      setPuterAuthStatus('signed-out');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out from Puter.ai
  const handlePuterSignOut = async () => {
    try {
      await waitForPuter();
      
      if (window.puter && window.puter.auth && window.puter.auth.signOut) {
        await window.puter.auth.signOut();
      }
      
      setPuterUser(null);
      setPuterAuthStatus('signed-out');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

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

      // Debug: Check what's available
      console.log('Puter.ai available:', {
        puter: !!window.puter,
        auth: !!window.puter?.auth,
        ai: !!window.puter?.ai,
        aiMethods: window.puter?.ai ? Object.keys(window.puter.ai) : [],
        isSignedIn: window.puter?.auth?.isSignedIn ? window.puter.auth.isSignedIn() : 'N/A'
      });

      // Step 1.5: Check authentication
      if (window.puter.auth && !window.puter.auth.isSignedIn()) {
        setLoading(false);
        setLoadingProgress('');
        setError('Please sign in to Puter.ai to use AI image analysis. Click "Sign in to Puter.ai" button above.');
        return;
      }

      // Check if AI chat is available
      if (!window.puter.ai || typeof window.puter.ai.chat !== 'function') {
        setLoading(false);
        setLoadingProgress('');
        const availableMethods = window.puter?.ai ? Object.keys(window.puter.ai).join(', ') : 'none';
        setError(`Puter.ai chat API is not available. Available methods: ${availableMethods}. Please check Puter.ai documentation.`);
        return;
      }

      // Step 2: Create image URL for Puter.ai
      setLoadingProgress('Preparing image...');
      // Convert file to data URL (Puter.ai might need this format)
      const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      console.log('Image prepared as data URL, length:', imageUrl.length);

      // Step 3: Analyze image with Puter.ai (client-side)
      setLoadingProgress('Analyzing image with AI...');
      
      const prompt = `Analyze this image of a vendor, food cart, or business. Extract and structure the information as JSON with the following format:

{
  "heading": "A short, descriptive title (e.g., 'Taco Stand', 'Coffee Cart', 'Food Truck', 'Vegetable Market Stall')",
  "description": "A brief AI-generated description of what this vendor offers, their specialties, or notable features (2-3 sentences)",
  "extractedText": "All visible text from signs, menus, or labels (preserve line breaks)",
  "extraInfo": {
    "items": ["List ALL visible items/products. For vegetable stalls, list all types of vegetables (e.g., 'Tomatoes', 'Cucumbers', 'Carrots', 'Lettuce', 'Onions'). For food vendors, list all menu items. For shops, list product categories or specific items visible."],
    "prices": ["Prices if visible"],
    "hours": "Operating hours if visible",
    "contact": "Phone number or contact info if visible",
    "features": ["Notable features like 'outdoor seating', 'cash only', etc."]
  }
}

IMPORTANT: 
- For vegetable/fruit stalls: Carefully identify and list ALL types of vegetables, fruits, or produce visible in the image
- For food vendors: List ALL menu items, dishes, or food types visible
- For shops: List ALL product categories or specific items visible
- Be thorough in identifying items - look at signs, displays, and visible products
- If information is not visible, use null or empty arrays
- Return ONLY valid JSON, no markdown formatting.`;

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
          console.log('Puter.ai chat params:', { prompt: prompt.substring(0, 50) + '...', imageUrl, model });
          
          // Try different API formats
          if (typeof window.puter.ai.chat === 'function') {
            puterResponse = await window.puter.ai.chat(
              prompt,
              imageUrl,
              { model: model }
            );
          } else {
            throw new Error('puter.ai.chat is not a function. Available methods: ' + Object.keys(window.puter.ai || {}).join(', '));
          }
          
          console.log(`Success with model: ${model}`, puterResponse);
          break; // Success, exit loop
        } catch (modelError) {
          const errorMsg = modelError?.message || modelError?.toString() || JSON.stringify(modelError);
          const errorStatus = modelError?.status || modelError?.statusCode;
          console.error(`Model ${model} failed:`, {
            message: errorMsg,
            status: errorStatus,
            error: modelError,
            fullError: JSON.stringify(modelError, Object.getOwnPropertyNames(modelError))
          });
          lastError = modelError;
          
          // If error mentions auth/401, stop trying other models
          if (errorStatus === 401 || (errorMsg && (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('unauthorized') || errorMsg.includes('sign in')))) {
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

      // Parse Puter.ai response - response structure: {message: {content: string}, ...}
      console.log('Puter.ai response structure:', puterResponse);
      let puterText;
      
      if (typeof puterResponse === 'string') {
        puterText = puterResponse;
      } else if (puterResponse?.message?.content) {
        // Standard Puter.ai response format
        puterText = puterResponse.message.content;
      } else if (puterResponse?.text) {
        puterText = puterResponse.text;
      } else if (puterResponse?.message) {
        // Try to extract from message object
        puterText = typeof puterResponse.message === 'string' 
          ? puterResponse.message 
          : JSON.stringify(puterResponse.message);
      } else {
        puterText = JSON.stringify(puterResponse);
      }
      
      console.log('Extracted Puter.ai text:', puterText.substring(0, 200));
      const cleanedText = puterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let analyzeData;
      try {
        analyzeData = JSON.parse(cleanedText);
        console.log('Parsed analyzeData:', analyzeData);
      } catch (parseError) {
        // If JSON parsing fails, create structured data from text
        console.error('Failed to parse Puter.ai response as JSON:', cleanedText);
        console.error('Parse error:', parseError);
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
      
      // Ensure required fields exist
      if (!analyzeData.heading) {
        analyzeData.heading = 'Vendor';
      }
      if (!analyzeData.description) {
        analyzeData.description = analyzeData.extractedText ? analyzeData.extractedText.substring(0, 200) : 'A vendor or business';
      }
      if (!analyzeData.extractedText) {
        analyzeData.extractedText = cleanedText;
      }
      if (!analyzeData.extraInfo) {
        analyzeData.extraInfo = {
          items: [],
          prices: [],
          hours: null,
          contact: null,
          features: []
        };
      }
      
      console.log('Final analyzeData to send:', analyzeData);

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
              console.error('Server error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
              });
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: `Server error: ${response.status} ${response.statusText}. Response: ${errorText}` };
              }
              throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            // Clear preview and vendor data, show thanks message
            setPreview(null);
            setVendorData(null);
            setServerMsg('Thank you! Your vendor has been added successfully.');
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
        
        {/* Puter.ai Authentication Status */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: puterAuthStatus === 'signed-in' ? '#1a4d1a' : puterAuthStatus === 'checking' ? '#333' : '#4d1a1a', 
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          {puterAuthStatus === 'checking' && (
            <div style={{ color: '#aaa' }}>Checking Puter.ai authentication...</div>
          )}
          {puterAuthStatus === 'signed-in' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#4CAF50' }}>
                ✅ Signed in to Puter.ai {puterUser?.username && `as ${puterUser.username}`}
              </div>
              <button
                onClick={handlePuterSignOut}
                style={{
                  padding: '5px 15px',
                  fontSize: '14px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          )}
          {puterAuthStatus === 'signed-out' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#ff6b6b' }}>
                ⚠️ Sign in to Puter.ai required for AI image analysis
              </div>
              <button
                onClick={handlePuterSignIn}
                disabled={authLoading}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  opacity: authLoading ? 0.6 : 1
                }}
              >
                {authLoading ? 'Signing in...' : 'Sign in to Puter.ai'}
              </button>
            </div>
          )}
        </div>
        
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
