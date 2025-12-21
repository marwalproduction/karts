import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

function App() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
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
            const apiUrl = process.env.REACT_APP_API_URL;
            const uploadUrl = apiUrl ? `${apiUrl}/upload` : '/api/upload';
            
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
      </header>
    </div>
  );
}

export default App;
