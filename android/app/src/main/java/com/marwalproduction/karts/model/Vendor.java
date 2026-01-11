package com.marwalproduction.karts.model;

import java.util.List;

public class Vendor {
    private String id;
    private String heading;
    private String description;
    private String extractedText;
    private Location location;
    private String createdAt;
    private ExtraInfo extraInfo;
    
    public Vendor() {}
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getHeading() {
        return heading;
    }
    
    public void setHeading(String heading) {
        this.heading = heading;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getExtractedText() {
        return extractedText;
    }
    
    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }
    
    public Location getLocation() {
        return location;
    }
    
    public void setLocation(Location location) {
        this.location = location;
    }
    
    // Convenience methods for backward compatibility
    public double getLat() {
        return location != null ? location.lat : 0.0;
    }
    
    public double getLng() {
        return location != null ? location.lng : 0.0;
    }
    
    public String getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
    
    public ExtraInfo getExtraInfo() {
        return extraInfo;
    }
    
    public void setExtraInfo(ExtraInfo extraInfo) {
        this.extraInfo = extraInfo;
    }
    
    public static class Location {
        public double lat;
        public double lng;
        
        public Location() {}
        
        public Location(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }
    
    public static class ExtraInfo {
        private List<String> items;
        private List<String> prices;
        private String hours;
        private String contact;
        private List<String> features;
        
        public ExtraInfo() {}
        
        public List<String> getItems() {
            return items;
        }
        
        public void setItems(List<String> items) {
            this.items = items;
        }
        
        public List<String> getPrices() {
            return prices;
        }
        
        public void setPrices(List<String> prices) {
            this.prices = prices;
        }
        
        public String getHours() {
            return hours;
        }
        
        public void setHours(String hours) {
            this.hours = hours;
        }
        
        public String getContact() {
            return contact;
        }
        
        public void setContact(String contact) {
            this.contact = contact;
        }
        
        public List<String> getFeatures() {
            return features;
        }
        
        public void setFeatures(List<String> features) {
            this.features = features;
        }
    }
}

