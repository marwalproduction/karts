package com.marwalproduction.karts.api;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.marwalproduction.karts.model.Vendor;
import okhttp3.*;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class ApiService {
    private static final String BASE_URL = "https://karts-tau.vercel.app";
    private static ApiService instance;
    private OkHttpClient client;
    private Gson gson;
    
    private ApiService() {
        client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
        gson = new Gson();
    }
    
    public static synchronized ApiService getInstance() {
        if (instance == null) {
            instance = new ApiService();
        }
        return instance;
    }
    
    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
    
    // Response wrapper for API responses
    private static class VendorsResponse {
        List<Vendor> vendors;
    }
    
    // Get all vendors
    public void getAllVendors(ApiCallback<List<Vendor>> callback) {
        Request request = new Request.Builder()
            .url(BASE_URL + "/api/vendors")
            .get()
            .build();
        
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String json = response.body().string();
                        // Try to parse as object with vendors property first
                        try {
                            VendorsResponse responseObj = gson.fromJson(json, VendorsResponse.class);
                            callback.onSuccess(responseObj != null && responseObj.vendors != null 
                                ? responseObj.vendors : new ArrayList<>());
                        } catch (Exception e) {
                            // Fallback: try parsing as array directly
                            Type listType = new TypeToken<List<Vendor>>(){}.getType();
                            List<Vendor> vendors = gson.fromJson(json, listType);
                            callback.onSuccess(vendors != null ? vendors : new ArrayList<>());
                        }
                    } catch (Exception e) {
                        callback.onError("Parse error: " + e.getMessage());
                    }
                } else {
                    callback.onError("Server error: " + response.code());
                }
            }
        });
    }
    
    // Search vendors
    public void searchVendors(String query, ApiCallback<List<Vendor>> callback) {
        String encodedQuery;
        try {
            encodedQuery = java.net.URLEncoder.encode(query, "UTF-8");
        } catch (java.io.UnsupportedEncodingException e) {
            encodedQuery = query; // Fallback to unencoded query
        }
        
        Request request = new Request.Builder()
            .url(BASE_URL + "/api/search?q=" + encodedQuery)
            .get()
            .build();
        
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String json = response.body().string();
                        // Parse as object with vendors property
                        VendorsResponse responseObj = gson.fromJson(json, VendorsResponse.class);
                        callback.onSuccess(responseObj != null && responseObj.vendors != null 
                            ? responseObj.vendors : new ArrayList<>());
                    } catch (Exception e) {
                        callback.onError("Parse error: " + e.getMessage());
                    }
                } else {
                    callback.onError("Server error: " + response.code());
                }
            }
        });
    }
    
    // Get nearby vendors
    public void getNearbyVendors(double lat, double lng, ApiCallback<List<Vendor>> callback) {
        Request request = new Request.Builder()
            .url(BASE_URL + "/api/nearby?lat=" + lat + "&lng=" + lng)
            .get()
            .build();
        
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Network error: " + e.getMessage());
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String json = response.body().string();
                        // Parse as object with vendors property
                        VendorsResponse responseObj = gson.fromJson(json, VendorsResponse.class);
                        callback.onSuccess(responseObj != null && responseObj.vendors != null 
                            ? responseObj.vendors : new ArrayList<>());
                    } catch (Exception e) {
                        callback.onError("Parse error: " + e.getMessage());
                    }
                } else {
                    callback.onError("Server error: " + response.code());
                }
            }
        });
    }
    
    // Upload image
    public void uploadImage(byte[] imageData, double lat, double lng, ApiCallback<String> callback) {
        RequestBody imageBody = RequestBody.create(
            MediaType.parse("image/jpeg"),
            imageData
        );
        
        MultipartBody requestBody = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("image", "photo.jpg", imageBody)
            .addFormDataPart("lat", String.valueOf(lat))
            .addFormDataPart("lng", String.valueOf(lng))
            .build();
        
        Request request = new Request.Builder()
            .url(BASE_URL + "/api/upload-image")
            .post(requestBody)
            .build();
        
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("Upload failed: " + e.getMessage());
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    String json = response.body().string();
                    callback.onSuccess(json);
                } else {
                    callback.onError("Upload failed: " + response.code());
                }
            }
        });
    }
}

