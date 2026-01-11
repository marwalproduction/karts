package com.marwalproduction.karts.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.fragment.app.Fragment;
import com.marwalproduction.karts.R;

public class PlantFragment extends Fragment {
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        // Reuse BrowseFragment for now, can be customized later
        return new BrowseFragment().onCreateView(inflater, container, savedInstanceState);
    }
}

