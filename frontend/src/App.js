import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'browse'
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState(null);
  const [ocr, setOcr] = useState(null);
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
    setOcr(null);
    setServerMsg(null);
    setLoadingProgress('Loading image...');
    setPreview(URL.createObjectURL(file));

    try {
      // Step 1: Perform OCR client-side
      setLoadingProgress('Extracting text from image...');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            setLoadingProgress(`Extracting text... ${progress}%`);
          }
        }
      });

      setOcr(text);
      setLoadingProgress('Getting location...');

      // Step 2: Get location
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

          // Step 3: Send OCR text and location to server
          setLoadingProgress('Sending data...');
          
          try {
            const uploadUrl = `${apiUrl}/api/upload`;
            
            const response = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ocr: text,
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
            setError(err.message || 'Failed to send data');
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
      setError(err.message || 'OCR processing failed');
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
            {ocr && (
              <div style={{ marginTop: '1em', background: '#222', padding: 12, borderRadius: 8, maxWidth: '90%' }}>
                <b>Extracted Text:</b>
                <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{ocr}</pre>
                {serverMsg && <div style={{ color: 'lightgreen', fontSize: '0.95em' }}>{serverMsg}</div>}
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
                  <div
                    key={vendor.id}
                    style={{
                      background: '#222',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      textAlign: 'left'
                    }}
                  >
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'white' }}>{vendor.text}</pre>
                    <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: '8px' }}>
                      {formatDate(vendor.createdAt)}
                    </div>
                  </div>
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
                  <div
                    key={vendor.id}
                    style={{
                      background: '#222',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      textAlign: 'left'
                    }}
                  >
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'white' }}>{vendor.text}</pre>
                    <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: '8px' }}>
                      {formatDate(vendor.createdAt)}
                    </div>
                  </div>
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
