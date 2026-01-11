# Native Android App Setup

The app has been converted from React/Capacitor to **Native Java Android**. The admin functionality has been excluded as requested.

## What's Included

### Features
- ✅ **Browse Tab**: Search and view nearby vendors
- ✅ **Add Vendor Tab**: Capture photo and upload with location
- ✅ **Favorites Tab**: Save and view favorite vendors
- ❌ **Admin Dashboard**: Excluded (as requested)

### Architecture
- **MainActivity**: Bottom navigation with 3 tabs
- **BrowseFragment**: Vendor list with search
- **AddVendorFragment**: Camera capture and upload
- **FavoritesFragment**: Saved favorites
- **VendorAdapter**: RecyclerView adapter for vendor cards
- **ApiService**: HTTP client for backend API calls
- **Vendor Model**: Data model for vendor information

## Dependencies Added

- Material Design Components
- RecyclerView & CardView
- CameraX (for camera)
- Google Play Services Location
- OkHttp (HTTP client)
- Glide (image loading)
- Gson (JSON parsing)

## Building the App

1. **Open in Android Studio**:
   ```bash
   cd frontend/android
   # Open Android Studio and select this directory
   ```

2. **Sync Gradle**:
   - Android Studio will prompt to sync
   - Or: File → Sync Project with Gradle Files

3. **Build**:
   - Build → Make Project
   - Or: `./gradlew build`

4. **Run**:
   - Click Run button
   - Or: `./gradlew installDebug`

## API Configuration

The app connects to: `https://karts-tau.vercel.app`

To change the API URL, edit:
```
frontend/android/app/src/main/java/com/marwalproduction/karts/api/ApiService.java
```

Change the `BASE_URL` constant.

## Permissions

The app requires:
- **Camera**: For capturing photos
- **Location**: For geolocation (fine & coarse)
- **Internet**: For API calls

All permissions are declared in `AndroidManifest.xml` and requested at runtime.

## Image Assets

To add the upload illustration image:
1. Copy `frontend/public/upload-illustration.png` to `frontend/android/app/src/main/res/drawable/upload_illustration.png`
2. Or add it manually in Android Studio: Right-click `res/drawable` → New → Image Asset

## Key Files

### Java Classes
- `MainActivity.java` - Main activity with bottom nav
- `fragments/BrowseFragment.java` - Browse screen
- `fragments/AddVendorFragment.java` - Upload screen
- `fragments/FavoritesFragment.java` - Favorites screen
- `adapter/VendorAdapter.java` - RecyclerView adapter
- `api/ApiService.java` - API client
- `model/Vendor.java` - Data model

### Layout Files
- `activity_main.xml` - Main layout with bottom nav
- `fragment_browse.xml` - Browse layout
- `fragment_add_vendor.xml` - Upload layout
- `fragment_favorites.xml` - Favorites layout
- `item_vendor.xml` - Vendor card layout

## Differences from React Version

1. **No Admin Tab**: Admin functionality completely removed
2. **Native Performance**: Faster startup and smoother scrolling
3. **Direct Camera**: Uses Android Camera API directly
4. **Native UI**: Material Design components
5. **Smaller Bundle**: No WebView overhead

## Troubleshooting

### Build Errors
- Make sure all dependencies are synced
- Clean build: Build → Clean Project
- Invalidate caches: File → Invalidate Caches

### Camera Not Working
- Check permissions in Settings → Apps → Karts → Permissions
- Ensure device has a camera

### Location Not Working
- Enable location services on device
- Grant location permission when prompted

### API Errors
- Check internet connection
- Verify API URL is correct
- Check backend is running at `https://karts-tau.vercel.app`

## Next Steps

1. Test all features
2. Add upload illustration image to drawable folder
3. Customize colors/styles in `res/values/`
4. Add app icon if needed
5. Build release APK for Play Store

