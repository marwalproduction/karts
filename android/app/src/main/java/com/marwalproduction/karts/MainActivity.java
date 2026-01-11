package com.marwalproduction.karts;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.marwalproduction.karts.fragments.BrowseFragment;
import com.marwalproduction.karts.fragments.AddVendorFragment;
import com.marwalproduction.karts.fragments.FavoritesFragment;

public class MainActivity extends AppCompatActivity {
    
    private BottomNavigationView bottomNavigationView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        
        // Set default fragment
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragment_container, new BrowseFragment())
                .commit();
        }
        
        // Handle bottom navigation clicks
        bottomNavigationView.setOnItemSelectedListener(item -> {
            Fragment selectedFragment = null;
            
            int itemId = item.getItemId();
            if (itemId == R.id.nav_browse) {
                selectedFragment = new BrowseFragment();
            } else if (itemId == R.id.nav_add) {
                selectedFragment = new AddVendorFragment();
            } else if (itemId == R.id.nav_favorites) {
                selectedFragment = new FavoritesFragment();
            }
            
            if (selectedFragment != null) {
                getSupportFragmentManager().beginTransaction()
                    .replace(R.id.fragment_container, selectedFragment)
                    .commit();
                return true;
            }
            
            return false;
        });
    }
    
    public void navigateToBrowse() {
        BrowseFragment browseFragment = new BrowseFragment();
        getSupportFragmentManager().beginTransaction()
            .replace(R.id.fragment_container, browseFragment)
            .commit();
        bottomNavigationView.setSelectedItemId(R.id.nav_browse);
    }
}
