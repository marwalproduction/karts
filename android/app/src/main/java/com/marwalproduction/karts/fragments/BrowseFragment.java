package com.marwalproduction.karts.fragments;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ArrayAdapter;
import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieDrawable;
import android.graphics.ColorFilter;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.widget.AutoCompleteTextView;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.core.app.ActivityCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.OnSuccessListener;
import com.marwalproduction.karts.R;
import com.marwalproduction.karts.adapter.SuggestionsAdapter;
import com.marwalproduction.karts.adapter.VendorAdapter;
import com.marwalproduction.karts.api.ApiService;
import com.marwalproduction.karts.model.Vendor;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class BrowseFragment extends Fragment {
    private RecyclerView recyclerView;
    private VendorAdapter adapter;
    private EditText searchInput;
    private View loadingView;
    private LottieAnimationView lottieAnimation;
    private TextView emptyStateText;
    private TextView currentLocationText;
    private CardView suggestionsCard;
    private RecyclerView suggestionsRecycler;
    private SuggestionsAdapter suggestionsAdapter;
    private FusedLocationProviderClient fusedLocationClient;
    private List<Vendor> allVendors = new ArrayList<>();
    private List<String> allItems = new ArrayList<>(); // For autocomplete suggestions
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_browse, container, false);
        
        recyclerView = view.findViewById(R.id.recycler_view);
        searchInput = view.findViewById(R.id.search_input);
        loadingView = view.findViewById(R.id.loading_view);
        lottieAnimation = view.findViewById(R.id.lottie_animation);
        emptyStateText = view.findViewById(R.id.empty_state_text);
        currentLocationText = view.findViewById(R.id.current_location_text);
        suggestionsCard = view.findViewById(R.id.suggestions_card);
        suggestionsRecycler = view.findViewById(R.id.suggestions_recycler);
        
        // Setup header text with colored "Nearby."
        TextView foundNearbyText = view.findViewById(R.id.found_nearby_text);
        if (foundNearbyText != null) {
            String fullText = "Found Nearby.";
            android.text.SpannableString spannable = new android.text.SpannableString(fullText);
            int nearbyStart = fullText.indexOf("Nearby");
            if (nearbyStart > 0) {
                spannable.setSpan(
                    new android.text.style.ForegroundColorSpan(0xFFFF8A2A), // Orange color
                    nearbyStart,
                    fullText.length(), // Include the period
                    android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                );
            }
            foundNearbyText.setText(spannable);
        }
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity());
        
        // Get and display current location
        updateCurrentLocation();
        
        // Setup RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new VendorAdapter(new ArrayList<>());
        recyclerView.setAdapter(adapter);
        
        // Setup suggestions RecyclerView
        suggestionsRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        suggestionsAdapter = new SuggestionsAdapter();
        suggestionsRecycler.setAdapter(suggestionsAdapter);
        
        suggestionsAdapter.setOnSuggestionClickListener(suggestion -> {
            searchInput.setText(suggestion);
            suggestionsCard.setVisibility(View.GONE);
            performSearch(suggestion);
        });
        
        // Setup search with autocomplete
        setupSearchView();
        
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
        
        // Load nearby vendors
        loadNearbyVendors();
        
        return view;
    }
    
    private void setupLoadingAnimation() {
        // Lottie animation is set up in onCreateView
    }
    
    private void startLoadingAnimation() {
        if (loadingView != null && loadingView.getVisibility() == View.VISIBLE) {
            // Hide empty state when loading
            if (emptyStateText != null) {
                emptyStateText.setVisibility(View.GONE);
            }
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
        // Ensure loading view is hidden
        if (loadingView != null) {
            loadingView.setVisibility(View.GONE);
        }
    }
    
    private void setupSearchView() {
        // Listen to search query changes
        searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String newText = s != null ? s.toString() : "";
                
                // Filter and show suggestions as user types (like HTML example)
                if (newText.length() > 0) {
                    // Make sure allItems is populated
                    if (allItems.isEmpty()) {
                        updateSuggestions();
                    }
                    
                    List<String> filtered = new ArrayList<>();
                    String lowerQuery = newText.toLowerCase(Locale.getDefault()).trim();
                    
                    // Improved matching: check if query matches item
                    for (String item : allItems) {
                        if (item == null || item.trim().isEmpty()) continue;
                        
                        String lowerItem = item.toLowerCase(Locale.getDefault());
                        
                        // Check multiple matching strategies:
                        // 1. Exact match (highest priority)
                        if (lowerItem.equals(lowerQuery)) {
                            if (!filtered.contains(item)) filtered.add(item);
                            continue;
                        }
                        
                        // 2. Starts with query
                        if (lowerItem.startsWith(lowerQuery)) {
                            if (!filtered.contains(item)) filtered.add(item);
                            continue;
                        }
                        
                        // 3. Contains query as substring
                        if (lowerItem.contains(lowerQuery)) {
                            if (!filtered.contains(item)) filtered.add(item);
                            continue;
                        }
                        
                        // 4. Word-level matching (check if any word in item starts with query)
                        String[] itemWords = lowerItem.split("\\s+");
                        for (String word : itemWords) {
                            if (word.startsWith(lowerQuery)) {
                                if (!filtered.contains(item)) filtered.add(item);
                                break;
                            }
                        }
                    }
                    
                    // Update suggestions adapter
                    if (suggestionsAdapter != null && suggestionsCard != null) {
                        suggestionsAdapter.updateSuggestions(filtered);
                        
                        // Show/hide suggestions card
                        if (filtered.isEmpty()) {
                            suggestionsCard.setVisibility(View.GONE);
                            Log.d("BrowseFragment", "Hiding suggestions card (0 matches). Query: '" + newText + "', allItems: " + allItems.size());
                        } else {
                            suggestionsCard.setVisibility(View.VISIBLE);
                            // Bring to front to ensure it's visible
                            suggestionsCard.bringToFront();
                            Log.d("BrowseFragment", "Showing suggestions card with " + filtered.size() + " items. Query: '" + newText + "', Filtered: " + filtered);
                        }
                        
                        // Force request layout to ensure visibility changes take effect
                        suggestionsCard.requestLayout();
                        suggestionsCard.invalidate();
                    } else {
                        Log.w("BrowseFragment", "suggestionsAdapter or suggestionsCard is null!");
                    }
                    
                    // Don't perform search while typing - only show suggestions
                    // Search will be performed when user clicks suggestion or presses enter
                } else {
                    // Hide suggestions when input is empty
                    if (suggestionsCard != null) {
                        suggestionsCard.setVisibility(View.GONE);
                    }
                    // Reload nearby vendors when search is cleared
                    adapter.setSearchQuery("");
                    loadNearbyVendors();
                }
            }
            
            @Override
            public void afterTextChanged(Editable s) {}
        });
        
        // Handle search action (when user presses search/enter)
        searchInput.setOnEditorActionListener((v, actionId, event) -> {
            String query = searchInput.getText().toString().trim();
            suggestionsCard.setVisibility(View.GONE);
            if (query.length() >= 2) {
                performSearch(query);
            }
            return true;
        });
    }
    
    private void updateSuggestions() {
        // Extract all unique items from vendors for autocomplete
        // Include vendor headings and items from extraInfo
        allItems.clear();
        for (Vendor vendor : allVendors) {
            // Add vendor heading/name
            if (vendor.getHeading() != null && !vendor.getHeading().trim().isEmpty()) {
                String heading = vendor.getHeading().trim();
                if (!allItems.contains(heading)) {
                    allItems.add(heading);
                }
            }
            // Add items from extraInfo
            if (vendor.getExtraInfo() != null && vendor.getExtraInfo().getItems() != null) {
                for (String item : vendor.getExtraInfo().getItems()) {
                    if (item != null && !item.trim().isEmpty() && !allItems.contains(item)) {
                        allItems.add(item);
                    }
                }
            }
        }
        Log.d("BrowseFragment", "Updated suggestions: " + allItems.size() + " items");
    }
    
    private void performSearch(String query) {
        if (query == null || query.trim().isEmpty()) {
            adapter.setSearchQuery("");
            loadNearbyVendors();
        } else {
            adapter.setSearchQuery(query);
            // Hide empty state and show loading
            if (emptyStateText != null) {
                emptyStateText.setVisibility(View.GONE);
            }
            loadingView.setVisibility(View.VISIBLE);
            startLoadingAnimation();
            // Ensure user location is set before search
            if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                    == PackageManager.PERMISSION_GRANTED) {
                fusedLocationClient.getLastLocation().addOnSuccessListener(requireActivity(), location -> {
                    if (location != null) {
                        adapter.setUserLocation(location);
                    }
                });
            }
            
            ApiService.getInstance().searchVendors(query, new ApiService.ApiCallback<List<Vendor>>() {
                @Override
                public void onSuccess(List<Vendor> vendors) {
                    mainHandler.post(() -> {
                        loadingView.setVisibility(View.GONE);
                        stopLoadingAnimation();
                        
                        // Client-side filtering as backup to ensure only matching results
                        String searchTerm = query.toLowerCase().trim();
                        List<Vendor> filteredVendors = filterVendors(vendors, searchTerm);
                        
                        adapter.updateVendors(filteredVendors);
                        emptyStateText.setVisibility(filteredVendors.isEmpty() ? View.VISIBLE : View.GONE);
                    });
                }
                
                @Override
                public void onError(String error) {
                    mainHandler.post(() -> {
                        loadingView.setVisibility(View.GONE);
                        stopLoadingAnimation();
                        // Fallback: filter all vendors client-side
                        String searchTerm = query.toLowerCase().trim();
                        List<Vendor> filteredVendors = filterVendors(allVendors, searchTerm);
                        adapter.updateVendors(filteredVendors);
                        emptyStateText.setVisibility(filteredVendors.isEmpty() ? View.VISIBLE : View.GONE);
                    });
                }
            });
        }
    }
    
    private List<Vendor> filterVendors(List<Vendor> vendors, String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return vendors;
        }
        
        String[] searchTerms = searchTerm.toLowerCase(Locale.getDefault()).trim().split("\\s+");
        if (searchTerms.length == 0) {
            return vendors;
        }
        
        // Score and filter vendors for better relevance
        List<Vendor> scoredVendors = new ArrayList<>();
        for (Vendor vendor : vendors) {
            int score = 0;
            String heading = (vendor.getHeading() != null ? vendor.getHeading() : "").toLowerCase(Locale.getDefault());
            String description = (vendor.getDescription() != null ? vendor.getDescription() : "").toLowerCase(Locale.getDefault());
            String extractedText = (vendor.getExtractedText() != null ? vendor.getExtractedText() : "").toLowerCase(Locale.getDefault());
            
            List<String> items = new ArrayList<>();
            if (vendor.getExtraInfo() != null && vendor.getExtraInfo().getItems() != null) {
                for (String item : vendor.getExtraInfo().getItems()) {
                    if (item != null) {
                        items.add(item.toLowerCase(Locale.getDefault()));
                    }
                }
            }
            
            List<String> features = new ArrayList<>();
            if (vendor.getExtraInfo() != null && vendor.getExtraInfo().getFeatures() != null) {
                for (String feature : vendor.getExtraInfo().getFeatures()) {
                    if (feature != null) {
                        features.add(feature.toLowerCase(Locale.getDefault()));
                    }
                }
            }
            
            // Check each search term
            for (String term : searchTerms) {
                if (term.isEmpty()) continue;
                
                // Exact match in heading (highest priority)
                if (heading.equals(term)) {
                    score += 100;
                } else if (heading.contains(term)) {
                    // Word boundary match in heading
                    String[] headingWords = heading.split("\\s+");
                    boolean wordMatch = false;
                    for (String word : headingWords) {
                        if (word.equals(term) || word.startsWith(term)) {
                            wordMatch = true;
                            break;
                        }
                    }
                    if (wordMatch) {
                        score += 50;
                    } else {
                        score += 20;
                    }
                }
                
                // Match in items (high priority)
                for (String item : items) {
                    if (item.equals(term)) {
                        score += 40;
                    } else if (item.contains(term)) {
                        String[] itemWords = item.split("\\s+");
                        boolean wordMatch = false;
                        for (String word : itemWords) {
                            if (word.equals(term) || word.startsWith(term)) {
                                wordMatch = true;
                                break;
                            }
                        }
                        if (wordMatch) {
                            score += 25;
                        } else {
                            score += 10;
                        }
                    }
                }
                
                // Match in features
                for (String feature : features) {
                    if (feature.equals(term)) {
                        score += 30;
                    } else if (feature.contains(term)) {
                        score += 15;
                    }
                }
                
                // Match in description (lower priority)
                if (description.contains(term)) {
                    String[] descWords = description.split("\\s+");
                    boolean wordMatch = false;
                    for (String word : descWords) {
                        if (word.equals(term) || word.startsWith(term)) {
                            wordMatch = true;
                            break;
                        }
                    }
                    if (wordMatch) {
                        score += 15;
                    } else {
                        score += 5;
                    }
                }
                
                // Match in extracted text (lower priority)
                if (extractedText.contains(term)) {
                    score += 5;
                }
            }
            
            // Only include vendors with a score > 0
            if (score > 0) {
                scoredVendors.add(vendor);
            }
        }
        
        // Sort by relevance (vendors with matches in heading/items first)
        scoredVendors.sort((a, b) -> {
            int aRelevance = 0;
            int bRelevance = 0;
            
            String aHeading = (a.getHeading() != null ? a.getHeading() : "").toLowerCase(Locale.getDefault());
            String bHeading = (b.getHeading() != null ? b.getHeading() : "").toLowerCase(Locale.getDefault());
            
            for (String term : searchTerms) {
                if (aHeading.contains(term)) aRelevance += 10;
                if (bHeading.contains(term)) bRelevance += 10;
                
                if (a.getExtraInfo() != null && a.getExtraInfo().getItems() != null) {
                    for (String item : a.getExtraInfo().getItems()) {
                        if (item != null && item.toLowerCase(Locale.getDefault()).contains(term)) {
                            aRelevance += 5;
                        }
                    }
                }
                
                if (b.getExtraInfo() != null && b.getExtraInfo().getItems() != null) {
                    for (String item : b.getExtraInfo().getItems()) {
                        if (item != null && item.toLowerCase(Locale.getDefault()).contains(term)) {
                            bRelevance += 5;
                        }
                    }
                }
            }
            
            return Integer.compare(bRelevance, aRelevance);
        });
        
        return scoredVendors;
    }
    
    private void loadNearbyVendors() {
        // Hide empty state and show loading
        if (emptyStateText != null) {
            emptyStateText.setVisibility(View.GONE);
        }
        loadingView.setVisibility(View.VISIBLE);
        startLoadingAnimation();
        
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
            // Request permission
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 100);
            loadingView.setVisibility(View.GONE);
            stopLoadingAnimation();
            return;
        }
        
        fusedLocationClient.getLastLocation().addOnSuccessListener(requireActivity(), location -> {
            if (location != null) {
                double lat = location.getLatitude();
                double lng = location.getLongitude();
                
                // Set user location in adapter for distance calculation
                adapter.setUserLocation(location);
                
                ApiService.getInstance().getNearbyVendors(lat, lng, new ApiService.ApiCallback<List<Vendor>>() {
                    @Override
                    public void onSuccess(List<Vendor> vendors) {
                        mainHandler.post(() -> {
                            loadingView.setVisibility(View.GONE);
                        stopLoadingAnimation();
                            allVendors = vendors;
                            adapter.updateVendors(vendors);
                            emptyStateText.setVisibility(vendors.isEmpty() ? View.VISIBLE : View.GONE);
                            // Update autocomplete suggestions
                            updateSuggestions();
                        });
                    }
                    
                    @Override
                    public void onError(String error) {
                        mainHandler.post(() -> {
                            loadingView.setVisibility(View.GONE);
                            stopLoadingAnimation();
                            Log.w("BrowseFragment", "Failed to load nearby vendors: " + error + ", falling back to all vendors");
                            // Fallback to all vendors
                            loadAllVendors();
                        });
                    }
                });
            } else {
                // Location not available, load all vendors
                loadAllVendors();
            }
        });
    }
    
    private void loadAllVendors() {
        // Try to get location for distance calculation
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.getLastLocation().addOnSuccessListener(requireActivity(), location -> {
                if (location != null) {
                    adapter.setUserLocation(location);
                }
            });
        }
        
        ApiService.getInstance().getAllVendors(new ApiService.ApiCallback<List<Vendor>>() {
            @Override
            public void onSuccess(List<Vendor> vendors) {
                mainHandler.post(() -> {
                    loadingView.setVisibility(View.GONE);
                    stopLoadingAnimation();
                    allVendors = vendors;
                    adapter.updateVendors(vendors);
                    emptyStateText.setVisibility(vendors.isEmpty() ? View.VISIBLE : View.GONE);
                    // Update autocomplete suggestions
                    updateSuggestions();
                });
            }
            
            @Override
            public void onError(String error) {
                mainHandler.post(() -> {
                    loadingView.setVisibility(View.GONE);
                    stopLoadingAnimation();
                    // Log error but don't show intrusive toast - just show empty state
                    Log.e("BrowseFragment", "Failed to load vendors: " + error);
                    // Show empty state with a helpful message
                    emptyStateText.setText("Unable to load vendors. Please check your connection and try again.");
                    emptyStateText.setVisibility(View.VISIBLE);
                });
            }
        });
    }
    
           @Override
           public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
               if (requestCode == 100 && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                   loadNearbyVendors();
                   updateCurrentLocation(); // Update location when permission is granted
               } else {
                   loadAllVendors();
               }
           }
           
           private void updateCurrentLocation() {
               if (currentLocationText == null) {
                   return;
               }
               
               if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                       != PackageManager.PERMISSION_GRANTED) {
                   mainHandler.post(() -> {
                       currentLocationText.setText("Location permission needed");
                   });
                   return;
               }
               
               fusedLocationClient.getLastLocation().addOnSuccessListener(requireActivity(), location -> {
                   if (location != null) {
                       getAddressFromLocation(location.getLatitude(), location.getLongitude());
                   } else {
                       // Try to get current location if last location is not available
                       fusedLocationClient.getCurrentLocation(
                           com.google.android.gms.location.LocationRequest.PRIORITY_HIGH_ACCURACY, 
                           null
                       ).addOnSuccessListener(requireActivity(), currentLocation -> {
                           if (currentLocation != null) {
                               getAddressFromLocation(currentLocation.getLatitude(), currentLocation.getLongitude());
                           } else {
                               mainHandler.post(() -> {
                                   currentLocationText.setText("Location unavailable");
                               });
                           }
                       }).addOnFailureListener(e -> {
                           mainHandler.post(() -> {
                               currentLocationText.setText("Unable to get location");
                           });
                       });
                   }
               }).addOnFailureListener(e -> {
                   mainHandler.post(() -> {
                       currentLocationText.setText("Location error");
                   });
               });
           }
           
           private void getAddressFromLocation(double lat, double lng) {
               try {
                   Geocoder geocoder = new Geocoder(requireContext(), Locale.getDefault());
                   List<Address> addresses = geocoder.getFromLocation(lat, lng, 1);
                   
                   if (addresses != null && !addresses.isEmpty()) {
                       Address address = addresses.get(0);
                       StringBuilder locationText = new StringBuilder();
                       
                       // Build address string
                       if (address.getLocality() != null) {
                           locationText.append(address.getLocality());
                       }
                       if (address.getAdminArea() != null) {
                           if (locationText.length() > 0) {
                               locationText.append(", ");
                           }
                           locationText.append(address.getAdminArea());
                       }
                       if (address.getCountryName() != null) {
                           if (locationText.length() > 0) {
                               locationText.append(", ");
                           }
                           locationText.append(address.getCountryName());
                       }
                       
                       // If we have a location, show it, otherwise show coordinates
                       String displayText = locationText.length() > 0 
                           ? locationText.toString()
                           : String.format(Locale.getDefault(), "%.4f, %.4f", lat, lng);
                       
                       mainHandler.post(() -> {
                           currentLocationText.setText(displayText);
                       });
                   } else {
                       // Fallback to coordinates if geocoding fails
                       String locationText = String.format(Locale.getDefault(), "%.4f, %.4f", lat, lng);
                       mainHandler.post(() -> {
                           currentLocationText.setText(locationText);
                       });
                   }
               } catch (Exception e) {
                   Log.e("BrowseFragment", "Geocoder error: " + e.getMessage());
                   // Fallback to coordinates on error
                   String locationText = String.format(Locale.getDefault(), "%.4f, %.4f", lat, lng);
                   mainHandler.post(() -> {
                       currentLocationText.setText(locationText);
                   });
               }
           }
       }

