package com.marwalproduction.karts.fragments;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.marwalproduction.karts.R;
import com.marwalproduction.karts.adapter.VendorAdapter;
import com.marwalproduction.karts.model.Vendor;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class FavoritesFragment extends Fragment {
    private RecyclerView recyclerView;
    private VendorAdapter adapter;
    private ProgressBar progressBar;
    private TextView emptyStateText;
    private SharedPreferences preferences;
    private static final String PREFS_NAME = "karts_prefs";
    private static final String KEY_FAVORITES = "favorited_vendors";
    
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_favorites, container, false);
        
        recyclerView = view.findViewById(R.id.recycler_view);
        progressBar = view.findViewById(R.id.progress_bar);
        emptyStateText = view.findViewById(R.id.empty_state_text);
        
        preferences = requireContext().getSharedPreferences(PREFS_NAME, 0);
        
        // Setup RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new VendorAdapter(new ArrayList<>());
        recyclerView.setAdapter(adapter);
        
        loadFavorites();
        
        return view;
    }
    
    @Override
    public void onResume() {
        super.onResume();
        loadFavorites();
    }
    
    private void loadFavorites() {
        progressBar.setVisibility(View.VISIBLE);
        emptyStateText.setVisibility(View.GONE);
        
        String favoritesJson = preferences.getString(KEY_FAVORITES, "[]");
        Gson gson = new Gson();
        Type listType = new TypeToken<List<Vendor>>(){}.getType();
        List<Vendor> favorites = gson.fromJson(favoritesJson, listType);
        
        if (favorites == null) {
            favorites = new ArrayList<>();
        }
        
        progressBar.setVisibility(View.GONE);
        adapter.updateVendors(favorites);
        emptyStateText.setVisibility(favorites.isEmpty() ? View.VISIBLE : View.GONE);
    }
}

