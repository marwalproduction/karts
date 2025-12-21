import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [serverMsg, setServerMsg] = useState(null);
  const fileInputRef = useRef(null);

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
    setPreview(URL.createObjectURL(file));

    // Get location automatically
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Set a timeout for geolocation (10 seconds)
    const geoTimeout = setTimeout(() => {
      setError('Location request timed out. Please enable location access and try again.');
      setLoading(false);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(geoTimeout);
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Automatically submit after getting location
        const formData = new FormData();
        formData.append('image', file);
        formData.append('lat', location.lat);
        formData.append('lng', location.lng);

        try {
          // Use /api/upload for Vercel deployment, or custom API URL if set
          const apiUrl = process.env.REACT_APP_API_URL;
          const uploadUrl = apiUrl ? `${apiUrl}/upload` : '/api/upload';
          
          // Add timeout to prevent infinite hanging (60 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
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
          setOcr(data.ocr);
          setServerMsg(data.message);
          setLoading(false);
        } catch (err) {
          if (err.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            setError(err.message || 'Upload failed');
          }
          setLoading(false);
        }
      },
      (err) => {
        clearTimeout(geoTimeout);
        setError('Could not retrieve location. Please enable location access.');
        setLoading(false);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 60000
      }
    );

    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="App">
      <header className="App-header">
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
          {loading ? 'Processing...' : '📷 Capture & Send'}
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
      </header>
    </div>
  );
}

export default App;
