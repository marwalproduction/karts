package com.marwalproduction.karts.adapter;

import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.net.Uri;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.marwalproduction.karts.R;
import com.marwalproduction.karts.model.Vendor;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class VendorAdapter extends RecyclerView.Adapter<VendorAdapter.VendorViewHolder> {
    private List<Vendor> vendors;
    private SharedPreferences preferences;
    private Location userLocation;
    private String searchQuery = "";
    private static final String PREFS_NAME = "karts_prefs";
    private static final String KEY_FAVORITES = "favorited_vendors";
    
    public VendorAdapter(List<Vendor> vendors) {
        this.vendors = new ArrayList<>(vendors);
    }
    
    public void updateVendors(List<Vendor> newVendors) {
        this.vendors = new ArrayList<>(newVendors);
        notifyDataSetChanged();
    }
    
    public void setUserLocation(Location location) {
        this.userLocation = location;
        notifyDataSetChanged();
    }
    
    public void setSearchQuery(String query) {
        this.searchQuery = query != null ? query.toLowerCase().trim() : "";
        notifyDataSetChanged();
    }
    
    @NonNull
    @Override
    public VendorViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_vendor, parent, false);
        return new VendorViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull VendorViewHolder holder, int position) {
        Vendor vendor = vendors.get(position);
        holder.bind(vendor, userLocation);
    }
    
    @Override
    public int getItemCount() {
        return vendors.size();
    }
    
    class VendorViewHolder extends RecyclerView.ViewHolder {
        private TextView headingText;
        private TextView lastSeenText;
        private TextView confirmedText;
        private LinearLayout capsulesLayout;
        private Button directionsButton;
        private ImageView favoriteButton;
        private Gson gson;
        
        public VendorViewHolder(@NonNull View itemView) {
            super(itemView);
            headingText = itemView.findViewById(R.id.vendor_heading);
            lastSeenText = itemView.findViewById(R.id.last_seen_text);
            confirmedText = itemView.findViewById(R.id.confirmed_text);
            capsulesLayout = itemView.findViewById(R.id.capsules_layout);
            directionsButton = itemView.findViewById(R.id.directions_button);
            favoriteButton = itemView.findViewById(R.id.favorite_button);
            
            preferences = itemView.getContext().getSharedPreferences(PREFS_NAME, 0);
            gson = new Gson();
        }
        
        public void bind(Vendor vendor, Location userLocation) {
            // Title
            headingText.setText(vendor.getHeading() != null ? vendor.getHeading() : "Vendor");
            
            // Capsules (Items) with highlighting
            capsulesLayout.removeAllViews();
            if (vendor.getExtraInfo() != null && vendor.getExtraInfo().getItems() != null 
                    && !vendor.getExtraInfo().getItems().isEmpty()) {
                for (String item : vendor.getExtraInfo().getItems()) {
                    TextView capsule = new TextView(itemView.getContext());
                    capsule.setText(item);
                    capsule.setTextSize(12.5f);
                    
                    // Highlight if matches search query
                    boolean isHighlighted = !searchQuery.isEmpty() && item.toLowerCase().contains(searchQuery);
                    if (isHighlighted) {
                        capsule.setTextColor(0xFFFFFFFF);
                        capsule.setBackgroundResource(R.drawable.capsule_background_highlighted);
                    } else {
                        capsule.setTextColor(0xFF333333);
                        capsule.setBackgroundResource(R.drawable.capsule_background);
                    }
                    
                    capsule.setPadding(
                        (int) (10 * itemView.getContext().getResources().getDisplayMetrics().density),
                        (int) (5 * itemView.getContext().getResources().getDisplayMetrics().density),
                        (int) (10 * itemView.getContext().getResources().getDisplayMetrics().density),
                        (int) (5 * itemView.getContext().getResources().getDisplayMetrics().density)
                    );
                    
                    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    );
                    params.setMargins(0, 0, 
                        (int) (6 * itemView.getContext().getResources().getDisplayMetrics().density), 0);
                    capsule.setLayoutParams(params);
                    
                    capsulesLayout.addView(capsule);
                }
            }
            
            // Last seen
            if (vendor.getCreatedAt() != null) {
                try {
                    SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                    Date date = inputFormat.parse(vendor.getCreatedAt());
                    long diffInMillis = System.currentTimeMillis() - date.getTime();
                    long diffInMinutes = TimeUnit.MILLISECONDS.toMinutes(diffInMillis);
                    long diffInHours = TimeUnit.MILLISECONDS.toHours(diffInMillis);
                    long diffInDays = TimeUnit.MILLISECONDS.toDays(diffInMillis);
                    
                    String lastSeen;
                    if (diffInMinutes < 60) {
                        lastSeen = "Last seen " + diffInMinutes + " min ago";
                    } else if (diffInHours < 24) {
                        lastSeen = "Last seen " + diffInHours + " hour" + (diffInHours > 1 ? "s" : "") + " ago";
                    } else {
                        lastSeen = "Last seen " + diffInDays + " day" + (diffInDays > 1 ? "s" : "") + " ago";
                    }
                    lastSeenText.setText(lastSeen);
                } catch (Exception e) {
                    lastSeenText.setText("Last seen recently");
                }
            } else {
                lastSeenText.setText("Last seen recently");
            }
            
            // Confirmed by X people (placeholder - can be enhanced later)
            // For now, show a default or calculate based on some metric
            int confirmedCount = (vendor.getExtraInfo() != null && vendor.getExtraInfo().getFeatures() != null) ? 
                                vendor.getExtraInfo().getFeatures().size() : 1; // Using features count as a placeholder
            confirmedText.setText("Confirmed by " + confirmedCount + " people");
            
            // Favorite button state and click handler
            if (favoriteButton != null) {
                updateFavoriteButton(vendor);
                favoriteButton.setOnClickListener(v -> toggleFavorite(vendor));
            }
            
            // Directions button with distance
            if (userLocation != null && vendor.getLocation() != null 
                    && vendor.getLocation().lat != 0.0 && vendor.getLocation().lng != 0.0) {
                float[] results = new float[1];
                Location.distanceBetween(
                    userLocation.getLatitude(), userLocation.getLongitude(),
                    vendor.getLocation().lat, vendor.getLocation().lng,
                    results
                );
                float distanceInMeters = results[0];
                
                // Validate distance (reasonable range: 0 to 20000 km)
                if (distanceInMeters >= 0 && distanceInMeters <= 20000000) {
                    String distanceText;
                    if (distanceInMeters < 1000) {
                        distanceText = String.format(Locale.getDefault(), "· %.0f m", distanceInMeters);
                    } else if (distanceInMeters < 10000) {
                        distanceText = String.format(Locale.getDefault(), "· %.2f km", distanceInMeters / 1000.0);
                    } else {
                        distanceText = String.format(Locale.getDefault(), "· %.1f km", distanceInMeters / 1000.0);
                    }
                    
                    // Create styled text: "Directions" in white, distance in slightly transparent white
                    String fullText = "Directions " + distanceText;
                    SpannableString spannable = new SpannableString(fullText);
                    int distanceStart = fullText.indexOf("·");
                    if (distanceStart > 0) {
                        spannable.setSpan(
                            new ForegroundColorSpan(0xCCFFFFFF), // Slightly transparent white
                            distanceStart,
                            fullText.length(),
                            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                        );
                    }
                    directionsButton.setText(spannable);
                } else {
                    // Invalid distance, just show directions without distance
                    directionsButton.setText("Directions");
                }
            } else {
                directionsButton.setText("Directions");
            }
            
            // Directions button click
            directionsButton.setOnClickListener(v -> {
                try {
                    if (vendor.getLocation() == null) {
                        Toast.makeText(itemView.getContext(), "Location not available for this vendor", Toast.LENGTH_SHORT).show();
                        Log.w("VendorAdapter", "Vendor location is null");
                        return;
                    }
                    
                    double lat = vendor.getLocation().lat;
                    double lng = vendor.getLocation().lng;
                    
                    // Validate coordinates
                    if (lat == 0.0 && lng == 0.0) {
                        Toast.makeText(itemView.getContext(), "Invalid location coordinates", Toast.LENGTH_SHORT).show();
                        Log.w("VendorAdapter", "Invalid coordinates: lat=" + lat + ", lng=" + lng);
                        return;
                    }
                    
                    // Use geo URI (most compatible, works with all map apps)
                    // Don't specify package name to avoid visibility restrictions
                    String geoUri = "geo:" + lat + "," + lng + "?q=" + lat + "," + lng;
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(geoUri));
                    
                    // Try to launch directly - if it fails, try with chooser
                    try {
                        itemView.getContext().startActivity(intent);
                        Log.d("VendorAdapter", "Opened directions using geo URI for lat=" + lat + ", lng=" + lng);
                    } catch (android.content.ActivityNotFoundException e) {
                        // If direct launch fails, try with a chooser
                        Log.w("VendorAdapter", "Direct launch failed, trying chooser", e);
                        Intent chooserIntent = Intent.createChooser(intent, "Open with");
                        try {
                            itemView.getContext().startActivity(chooserIntent);
                            Log.d("VendorAdapter", "Opened directions using chooser");
                        } catch (android.content.ActivityNotFoundException e2) {
                            // Last resort: try Google Maps web URL
                            Log.w("VendorAdapter", "Chooser also failed, trying web URL", e2);
                            String webUrl = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
                            Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(webUrl));
                            try {
                                itemView.getContext().startActivity(webIntent);
                                Log.d("VendorAdapter", "Opened directions using web URL");
                            } catch (android.content.ActivityNotFoundException e3) {
                                Log.e("VendorAdapter", "All methods failed", e3);
                                Toast.makeText(itemView.getContext(), "No map application found. Please install a map app like Google Maps.", Toast.LENGTH_LONG).show();
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e("VendorAdapter", "Error opening directions", e);
                    Toast.makeText(itemView.getContext(), "Failed to open directions: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
        
        private void updateFavoriteButton(Vendor vendor) {
            if (favoriteButton == null) return;
            List<Vendor> favorites = getFavorites();
            boolean isFavorite = isFavorite(vendor, favorites);
            favoriteButton.setColorFilter(isFavorite ? 0xFFFF8A2A : 0xFFCCCCCC); // Orange if favorite, grey if not
        }
        
        private void toggleFavorite(Vendor vendor) {
            List<Vendor> favorites = getFavorites();
            boolean isFavorite = isFavorite(vendor, favorites);
            
            if (isFavorite) {
                // Remove from favorites
                favorites.removeIf(v -> v.getId() != null && v.getId().equals(vendor.getId()));
                Toast.makeText(itemView.getContext(), "Removed from favorites", Toast.LENGTH_SHORT).show();
            } else {
                // Add to favorites
                favorites.add(vendor);
                Toast.makeText(itemView.getContext(), "Added to favorites", Toast.LENGTH_SHORT).show();
            }
            
            saveFavorites(favorites);
            updateFavoriteButton(vendor);
        }
        
        private boolean isFavorite(Vendor vendor, List<Vendor> favorites) {
            if (vendor.getId() == null) return false;
            for (Vendor fav : favorites) {
                if (fav.getId() != null && fav.getId().equals(vendor.getId())) {
                    return true;
                }
            }
            return false;
        }
        
        private List<Vendor> getFavorites() {
            String favoritesJson = preferences.getString(KEY_FAVORITES, "[]");
            Type listType = new TypeToken<List<Vendor>>(){}.getType();
            List<Vendor> favorites = gson.fromJson(favoritesJson, listType);
            if (favorites == null) {
                favorites = new ArrayList<>();
            }
            return favorites;
        }
        
        private void saveFavorites(List<Vendor> favorites) {
            String favoritesJson = gson.toJson(favorites);
            preferences.edit().putString(KEY_FAVORITES, favoritesJson).apply();
        }
        
    }
}
