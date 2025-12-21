const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  ocr: {
    type: String,
    required: true,
    index: 'text' // Enable text search
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere' // Enable geospatial queries
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Index for sorting by date
  }
});

// Create geospatial index
vendorSchema.index({ location: '2dsphere' });
vendorSchema.index({ ocr: 'text' });

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

