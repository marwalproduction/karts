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
  const [isFavorited, setIsFavorited] = useState(false);
  
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '16px',
        marginBottom: '20px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative'
      }}
    >
      {/* Favorite Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsFavorited(!isFavorited);
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        {isFavorited ? '❤️' : '🤍'}
      </button>
      
      <div style={{ padding: '16px' }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '12px', 
          color: '#000', 
          fontSize: '18px',
          fontWeight: '600',
          paddingRight: '40px'
        }}>
          {vendor.heading || 'Vendor'}
        </h3>
        
        {/* Items */}
        {vendor.extraInfo?.items && vendor.extraInfo.items.length > 0 && (
          <div style={{ marginTop: '12px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {vendor.extraInfo.items.map((item, i) => {
              const getIcon = (itemName) => {
                const name = itemName.toLowerCase();
                if (name.includes('vegetable') || name.includes('tomato') || name.includes('cucumber') || name.includes('carrot')) return '🥬';
                if (name.includes('fruit') || name.includes('apple') || name.includes('banana')) return '🍎';
                if (name.includes('tea') || name.includes('chai')) return '☕';
                if (name.includes('coffee')) return '☕';
                return '📦';
              };
              return (
                <span key={i} style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#f5f5f5',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: '#666',
                }}>
                  <span>{getIcon(item)}</span>
                  <span>{item}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Contact info */}
        {(vendor.extraInfo?.contact || vendor.extraInfo?.hours) && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
            {vendor.extraInfo.contact && (
              <div style={{ marginTop: '6px' }}>
                📞 {vendor.extraInfo.contact}
              </div>
            )}
            {vendor.extraInfo.hours && (
              <div style={{ marginTop: '6px' }}>
                🕐 {vendor.extraInfo.hours}
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #f0f0f0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span style={{ fontSize: '12px', color: '#999' }}>{formatDate(vendor.createdAt)}</span>
          {vendor.location?.lat && vendor.location?.lng && (
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${vendor.location.lat},${vendor.location.lng}`;
                window.open(url, '_blank');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Directions →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('browse'); // 'add', 'browse', or 'favorites'
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
  
  // Favorites state
  const [favoritedVendors, setFavoritedVendors] = useState(() => {
    const saved = localStorage.getItem('favoritedVendors');
    return saved ? JSON.parse(saved) : [];
  });

  // Toggle favorite
  const toggleFavorite = (vendor) => {
    setFavoritedVendors(prev => {
      const isFavorited = prev.some(v => v.id === vendor.id);
      let newFavorites;
      if (isFavorited) {
        newFavorites = prev.filter(v => v.id !== vendor.id);
      } else {
        newFavorites = [...prev, vendor];
      }
      localStorage.setItem('favoritedVendors', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Check if vendor is favorited
  const isVendorFavorited = (vendorId) => {
    return favoritedVendors.some(v => v.id === vendorId);
  };

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

      // Parse Puter.ai response
      let puterText = typeof puterResponse === 'string' ? puterResponse : puterResponse.text || JSON.stringify(puterResponse);
      const cleanedText = puterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let analyzeData;
      try {
        analyzeData = JSON.parse(cleanedText);
        // Ensure required fields have defaults
        if (!analyzeData.heading && !analyzeData.title) {
          analyzeData.heading = 'Vendor';
        } else if (!analyzeData.heading && analyzeData.title) {
          analyzeData.heading = analyzeData.title;
        }
        if (!analyzeData.description) {
          analyzeData.description = '';
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
            
            // Ensure required fields are present
            const heading = analyzeData.heading || analyzeData.title || 'Vendor';
            const description = analyzeData.description || '';
            const extractedText = analyzeData.extractedText || cleanedText || '';
            const extraInfo = analyzeData.extraInfo || {};
            const lat = location.lat;
            const lng = location.lng;
            
            // Validate required fields
            if (!heading || lat === undefined || lng === undefined) {
              throw new Error(`Missing required fields: heading=${heading}, lat=${lat}, lng=${lng}`);
            }
            
            const response = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                heading: heading,
                description: description,
                extractedText: extractedText,
                extraInfo: extraInfo,
                lat: lat,
                lng: lng,
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
    <div className="App" style={{ 
      background: '#f5f5f5', 
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden',
      margin: 0,
      padding: 0
    }}>
      <header className="App-header" style={{
        background: '#fff',
        minHeight: '100vh',
        padding: '0',
        color: '#000',
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
        paddingBottom: '80px',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px 20px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>
                Hello, User
              </div>
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '400' }}>
                Welcome to Karts Vendor
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                👤
              </div>
              <div style={{ fontSize: '20px', color: '#000', cursor: 'pointer' }}>⚙️</div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          background: '#fff',
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}>
        
          {/* Search Bar */}
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search vendors..."
              value={activeTab === 'browse' ? searchQuery : ''}
              onChange={(e) => {
                if (activeTab === 'browse') {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }
              }}
              style={{ 
                width: '100%',
                maxWidth: '100%',
                padding: '14px 16px', 
                fontSize: '15px', 
                borderRadius: '12px', 
                border: '1px solid #e0e0e0',
                background: '#f5f5f5',
                color: '#000',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #000';
                e.target.style.background = '#fff';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid #e0e0e0';
                e.target.style.background = '#f5f5f5';
              }}
            />
          </div>


          {/* Add Vendor Tab */}
          {activeTab === 'add' && (
            <div>
              {/* Puter.ai Authentication Status - Only on Add page */}
              <div style={{ 
                marginBottom: '30px', 
                padding: '15px 20px', 
                background: puterAuthStatus === 'signed-in' 
                  ? '#f5f5f5' 
                  : puterAuthStatus === 'checking' 
                    ? '#f9f9f9' 
                    : '#f5f5f5', 
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}>
                {puterAuthStatus === 'checking' && (
                  <div style={{ color: '#666', fontSize: '0.9em' }}>Checking authentication...</div>
                )}
                {puterAuthStatus === 'signed-in' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#000', fontSize: '0.9em' }}>
                      Signed in {puterUser?.username && `as ${puterUser.username}`}
                    </div>
                    <button
                      onClick={handlePuterSignOut}
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.85em',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
                {puterAuthStatus === 'signed-out' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#666', fontSize: '0.9em' }}>
                      Sign in required for AI analysis
                    </div>
                    <button
                      onClick={handlePuterSignIn}
                      disabled={authLoading}
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.85em',
                        backgroundColor: '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: authLoading ? 'not-allowed' : 'pointer',
                        opacity: authLoading ? 0.6 : 1
                      }}
                    >
                      {authLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                style={{ display: 'none' }}
              />
              <div style={{ 
                background: '#fff',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '2px dashed #e0e0e0',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#000' }}>
                  Add a Vendor
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                  Capture a photo of a vendor or food cart
                </div>
                <button 
                  onClick={handleCaptureAndSend} 
                  disabled={loading} 
                  style={{ 
                    padding: '14px 32px', 
                    fontSize: '15px',
                    fontWeight: '600',
                    background: loading ? '#f5f5f5' : '#000',
                    color: loading ? '#999' : '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                >
                  {loading ? (loadingProgress || 'Processing...') : 'Capture Photo'}
                </button>
              </div>
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
            <div>
              {searchLoading && <p style={{ marginTop: '12px', color: '#666', fontSize: '14px', textAlign: 'center' }}>Searching...</p>}

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Search Results</h3>
                {searchResults.map((vendor) => (
                  <VendorCard 
                    key={vendor.id} 
                    vendor={vendor} 
                    formatDate={formatDate}
                    isFavorited={isVendorFavorited(vendor.id)}
                    onToggleFavorite={toggleFavorite}
                  />
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
                  <VendorCard 
                    key={vendor.id} 
                    vendor={vendor} 
                    formatDate={formatDate}
                    isFavorited={isVendorFavorited(vendor.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              ) : (
                <p style={{ color: '#aaa' }}>No nearby vendors found. Be the first to add one!</p>
              )}
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '24px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#000'
            }}>
              ❤️ Favorites
            </h2>
            {favoritedVendors.length > 0 ? (
              favoritedVendors.map((vendor) => (
                <VendorCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  formatDate={formatDate}
                  isFavorited={true}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No favorites yet</p>
                <p style={{ fontSize: '14px', color: '#999' }}>Tap the heart icon on any vendor to add it to favorites</p>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Bottom Navigation */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          maxWidth: '100%',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', gap: '40px', maxWidth: '428px', width: '100%', justifyContent: 'space-around' }}>
            <div 
              style={{ textAlign: 'center', cursor: 'pointer', flex: 1 }}
              onClick={() => setActiveTab('browse')}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏠</div>
              <div style={{ fontSize: '11px', color: activeTab === 'browse' ? '#000' : '#999', fontWeight: activeTab === 'browse' ? '600' : '400' }}>Home</div>
            </div>
            <div 
              style={{ 
                textAlign: 'center', 
                cursor: 'pointer', 
                flex: 1 
              }}
              onClick={() => setActiveTab('favorites')}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>❤️</div>
              <div style={{ 
                fontSize: '11px', 
                color: activeTab === 'favorites' ? '#000' : '#999',
                fontWeight: activeTab === 'favorites' ? '600' : '400'
              }}>
                Favorites
              </div>
            </div>
            <div 
              style={{ textAlign: 'center', cursor: 'pointer', flex: 1 }}
              onClick={() => setActiveTab('add')}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>➕</div>
              <div style={{ fontSize: '11px', color: activeTab === 'add' ? '#000' : '#999', fontWeight: activeTab === 'add' ? '600' : '400' }}>Add</div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
