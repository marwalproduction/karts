# Karts - Local Vendor Discovery Platform

A platform for discovering and sharing local vendors (food carts, shops, services) with location-based search.

## Project Structure

The project is organized into three main folders:

### 📁 `backend/`
Contains all backend API serverless functions:
- `github-storage.js` - GitHub API integration for data storage
- `upload-image.js` - Image upload handler
- `vendors.js` - Get all vendors
- `search.js` - Search vendors
- `nearby.js` - Get nearby vendors
- `admin/` - Admin dashboard endpoints
  - `pending.js` - Manage pending images
  - `pending/csv.js` - CSV export
  - `pending/bulk-upload.js` - Bulk upload processed vendors

**Note:** The `api/` folder is a symlink to `backend/` for Vercel deployment compatibility.

### 🌐 `webapp/`
React-based web application:
- Main React app (`src/App.js`)
- Public assets
- Build output
- Capacitor configuration (for mobile)

### 📱 `android/`
Native Android application:
- Java source code
- Android resources (layouts, drawables)
- Gradle build configuration
- Native Android app (not Capacitor-based)

## Setup

### Backend Setup
The backend is deployed on Vercel as serverless functions. API endpoints are available at `/api/*`.

### Web App Setup
```bash
cd webapp
npm install
npm start  # Development
npm run build  # Production build
```

### Android App Setup
```bash
cd android
./gradlew assembleDebug  # Build APK
```

Open in Android Studio for development.

## Environment Variables

Required environment variables (set in Vercel):
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_OWNER` - GitHub username/organization
- `GITHUB_REPO` - Repository name
- `OPENAI_API_KEY` - OpenAI API key (for image processing)

## Deployment

- **Backend**: Automatically deployed via Vercel when changes are pushed to `main` branch
- **Web App**: Build output is served by Vercel
- **Android**: Build APK manually or use Android Studio

## API Endpoints

- `GET /api/vendors` - Get all vendors
- `GET /api/search?q=query` - Search vendors
- `GET /api/nearby?lat=X&lng=Y` - Get nearby vendors
- `POST /api/upload-image` - Upload vendor image
- `GET /api/admin/pending` - List pending images (admin)
- `GET /api/admin/pending/csv` - Export pending images as CSV
- `POST /api/admin/pending/bulk-upload` - Bulk upload processed vendors

## Features

- 🔍 Location-based vendor search
- 📸 Image upload with automatic processing
- 🗺️ Nearby vendor discovery
- ⭐ Favorites/saved vendors
- 👤 Admin dashboard for reviewing submissions
- 📊 CSV export/import for bulk processing

## License

MIT

