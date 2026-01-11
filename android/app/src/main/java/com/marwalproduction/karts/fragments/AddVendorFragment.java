package com.marwalproduction.karts.fragments;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.Toast;
import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieDrawable;
import android.graphics.ColorFilter;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.Fragment;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.marwalproduction.karts.MainActivity;
import com.marwalproduction.karts.R;
import com.marwalproduction.karts.api.ApiService;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class AddVendorFragment extends Fragment {
    private static final int REQUEST_CAMERA_PERMISSION = 101;
    private static final int REQUEST_LOCATION_PERMISSION = 102;
    
    private ImageView previewImageView;
    private ImageView illustrationImage;
    private View loadingView;
    private LottieAnimationView lottieAnimation;
    private View thanksScreen;
    private FusedLocationProviderClient fusedLocationClient;
    private Bitmap capturedImage;
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    
    private ActivityResultLauncher<Intent> cameraLauncher;
    private File photoFile;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register for camera activity result - using TakePicture contract
        cameraLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                Log.d("AddVendorFragment", "Camera result received. Result code: " + result.getResultCode());
                if (result.getResultCode() == android.app.Activity.RESULT_OK) {
                    // Try to get image from file first (better quality)
                    if (photoFile != null && photoFile.exists()) {
                        try {
                            Bitmap image = BitmapFactory.decodeFile(photoFile.getAbsolutePath());
                            if (image != null) {
                                Log.d("AddVendorFragment", "Image loaded from file. Size: " + image.getWidth() + "x" + image.getHeight());
                                capturedImage = image;
                                updatePreview();
                                return;
                            }
                        } catch (Exception e) {
                            Log.e("AddVendorFragment", "Error loading image from file", e);
                        }
                    }
                    
                    // Fallback: try to get thumbnail from intent
                    Intent data = result.getData();
                    if (data != null) {
                        Bundle extras = data.getExtras();
                        if (extras != null) {
                            Bitmap image = (Bitmap) extras.get("data");
                            if (image != null) {
                                Log.d("AddVendorFragment", "Image from thumbnail. Size: " + image.getWidth() + "x" + image.getHeight());
                                capturedImage = image;
                                updatePreview();
                            } else {
                                Log.w("AddVendorFragment", "Image bitmap is null in extras");
                            }
                        } else {
                            Log.w("AddVendorFragment", "Extras bundle is null");
                        }
                    } else {
                        Log.w("AddVendorFragment", "Result data is null");
                    }
                } else {
                    Log.d("AddVendorFragment", "Camera result not OK. Code: " + result.getResultCode());
                }
            }
        );
    }
    
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_add_vendor, container, false);
        
        previewImageView = view.findViewById(R.id.preview_image);
        illustrationImage = view.findViewById(R.id.illustration_image);
        loadingView = view.findViewById(R.id.loading_view);
        lottieAnimation = view.findViewById(R.id.lottie_animation);
        thanksScreen = view.findViewById(R.id.thanks_screen);
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity());
        
        // Setup loading animation
        setupLoadingAnimation();
        
        // Load Lottie animation from URL
        if (lottieAnimation != null) {
            lottieAnimation.setAnimationFromUrl("https://lottie.host/631f695b-da7e-4b95-901f-dc8c427d4eea/blD44S91Ho.lottie");
            lottieAnimation.setRepeatCount(LottieDrawable.INFINITE);
            lottieAnimation.setSpeed(1.0f);
            // Apply orange color filter to match theme (#FF8A2A)
            ColorFilter colorFilter = new PorterDuffColorFilter(0xFFFF8A2A, PorterDuff.Mode.SRC_ATOP);
            lottieAnimation.setColorFilter(colorFilter);
        }
        
        // Load illustration image if available
        if (illustrationImage != null) {
            try {
                // Try to load upload illustration, fallback to placeholder
                illustrationImage.setImageResource(R.drawable.upload_illustration);
            } catch (Exception e) {
                illustrationImage.setImageResource(R.drawable.ic_launcher_background);
            }
        }
        
        // Make illustration image clickable - only for capturing photo
        illustrationImage.setOnClickListener(v -> {
            Log.d("AddVendorFragment", "Illustration image clicked. capturedImage is null: " + (capturedImage == null));
            if (capturedImage == null) {
                Log.d("AddVendorFragment", "Calling capturePhoto()");
                capturePhoto();
            }
        });
        
        return view;
    }
    
    private void setupLoadingAnimation() {
        // Lottie animation is set up in onCreateView
    }
    
    private void startLoadingAnimation() {
        if (loadingView != null && loadingView.getVisibility() == View.VISIBLE) {
            if (lottieAnimation != null) {
                lottieAnimation.setVisibility(View.VISIBLE);
                lottieAnimation.playAnimation();
            }
        }
    }
    
    private void stopLoadingAnimation() {
        if (lottieAnimation != null) {
            lottieAnimation.cancelAnimation();
            lottieAnimation.setVisibility(View.GONE);
        }
    }
    
    private void capturePhoto() {
        Log.d("AddVendorFragment", "capturePhoto() called");
        
        // Check camera permission
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            Log.d("AddVendorFragment", "Camera permission not granted, requesting...");
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA_PERMISSION);
            return;
        }
        
        Log.d("AddVendorFragment", "Camera permission granted, creating intent");
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        
        // Try to create a file for full-size image (optional - if this fails, we'll use thumbnail)
        photoFile = null;
        try {
            photoFile = createImageFile();
            if (photoFile != null) {
                Log.d("AddVendorFragment", "Photo file created: " + photoFile.getAbsolutePath());
                try {
                    Uri photoURI = FileProvider.getUriForFile(requireContext(),
                        requireContext().getPackageName() + ".fileprovider",
                        photoFile);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                    takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    Log.d("AddVendorFragment", "File URI added to intent: " + photoURI);
                } catch (IllegalArgumentException e) {
                    Log.e("AddVendorFragment", "Error creating FileProvider URI (authority mismatch?)", e);
                    // Continue without file - will use thumbnail instead
                    photoFile = null;
                } catch (Exception e) {
                    Log.e("AddVendorFragment", "Error creating FileProvider URI", e);
                    // Continue without file - will use thumbnail instead
                    photoFile = null;
                }
            }
        } catch (IOException ex) {
            Log.e("AddVendorFragment", "Error creating image file", ex);
            photoFile = null;
        }
        
        // If file creation failed, we'll use thumbnail (no EXTRA_OUTPUT)
        if (photoFile == null) {
            Log.d("AddVendorFragment", "Using thumbnail mode (no file output)");
        }
        
        // Try to launch camera - some devices return null from resolveActivity even when camera exists
        try {
            Log.d("AddVendorFragment", "Attempting to launch camera intent...");
            cameraLauncher.launch(takePictureIntent);
            Log.d("AddVendorFragment", "Camera launcher launched successfully");
        } catch (android.content.ActivityNotFoundException e) {
            Log.e("AddVendorFragment", "No camera app found", e);
            mainHandler.post(() -> {
                Toast.makeText(requireContext(), "No camera app found. Please install a camera app.", Toast.LENGTH_LONG).show();
            });
        } catch (Exception e) {
            Log.e("AddVendorFragment", "Error launching camera", e);
            mainHandler.post(() -> {
                Toast.makeText(requireContext(), "Error opening camera: " + e.getMessage(), Toast.LENGTH_LONG).show();
            });
        }
    }
    
    private File createImageFile() throws IOException {
        String imageFileName = "JPEG_" + System.currentTimeMillis() + "_";
        File storageDir = requireContext().getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES);
        File image = File.createTempFile(imageFileName, ".jpg", storageDir);
        return image;
    }
    
    private void updatePreview() {
        mainHandler.post(() -> {
            if (previewImageView != null && capturedImage != null) {
                previewImageView.setImageBitmap(capturedImage);
                previewImageView.setVisibility(View.VISIBLE);
                Log.d("AddVendorFragment", "Preview image set and visible");
            } else {
                Log.w("AddVendorFragment", "previewImageView or capturedImage is null");
            }
            if (illustrationImage != null) {
                illustrationImage.setVisibility(View.GONE);
            }
            
            // Automatically start upload after preview is shown
            if (capturedImage != null) {
                Log.d("AddVendorFragment", "Auto-starting upload after photo capture");
                uploadImage();
            }
        });
    }
    
    private void uploadImage() {
        if (capturedImage == null) {
            Toast.makeText(getContext(), "Please capture an image first", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Check location permission
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_LOCATION_PERMISSION);
            return;
        }
        
        loadingView.setVisibility(View.VISIBLE);
        startLoadingAnimation();
        illustrationImage.setClickable(false);
        if (previewImageView != null) {
            previewImageView.setClickable(false);
        }
        
        fusedLocationClient.getLastLocation().addOnSuccessListener(requireActivity(), location -> {
            if (location == null) {
                mainHandler.post(() -> {
                    loadingView.setVisibility(View.GONE);
                    stopLoadingAnimation();
                    illustrationImage.setClickable(true);
                    previewImageView.setClickable(true);
                    Toast.makeText(requireContext(), "Location not available. Please enable location services.", Toast.LENGTH_LONG).show();
                });
                return;
            }
            
            double lat = location.getLatitude();
            double lng = location.getLongitude();
            
            // Convert bitmap to byte array
            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            capturedImage.compress(Bitmap.CompressFormat.JPEG, 90, stream);
            byte[] imageData = stream.toByteArray();
            
            ApiService.getInstance().uploadImage(imageData, lat, lng, new ApiService.ApiCallback<String>() {
                @Override
                public void onSuccess(String result) {
                    mainHandler.post(() -> {
                        loadingView.setVisibility(View.GONE);
                    stopLoadingAnimation();
                        
                        // Hide all other views
                        previewImageView.setVisibility(View.GONE);
                        illustrationImage.setVisibility(View.GONE);
                        
                        // Show thanks screen
                        if (thanksScreen != null) {
                            thanksScreen.setVisibility(View.VISIBLE);
                        }
                        
                        // Navigate to homepage after 3 seconds
                        mainHandler.postDelayed(() -> {
                            navigateToHomepage();
                        }, 3000);
                    });
                }
                
                @Override
                public void onError(String error) {
                    mainHandler.post(() -> {
                        loadingView.setVisibility(View.GONE);
                    stopLoadingAnimation();
                        illustrationImage.setClickable(true);
                        previewImageView.setClickable(true);
                        Toast.makeText(requireContext(), "Upload failed: " + error, Toast.LENGTH_SHORT).show();
                    });
                }
            });
        });
    }
    
    private void navigateToHomepage() {
        // Navigate to BrowseFragment (homepage)
        if (getActivity() != null) {
            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.navigateToBrowse();
            }
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                capturePhoto();
            } else {
                Toast.makeText(getContext(), "Camera permission is required", Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == REQUEST_LOCATION_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                uploadImage();
            } else {
                Toast.makeText(getContext(), "Location permission is required", Toast.LENGTH_SHORT).show();
            }
        }
    }
}

