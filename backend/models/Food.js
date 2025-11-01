const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  foodType: {
    type: String,
    enum: ['veg', 'non-veg', 'vegan', 'mixed'],
    required: true
  },
  quantity: {
    type: String,
    required: true
  },
  servings: {
    type: Number,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true
  },
  pickupWindow: {
    start: Date,
    end: Date
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  images: [{
    url: String,
    publicId: String
  }],
  status: {
    type: String,
    enum: ['available', 'requested', 'assigned', 'picked-up', 'completed', 'expired', 'cancelled'],
    default: 'available'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  verificationCode: {
    type: String
  },
  qrCodeUrl: String,
  completedAt: Date,
  proofPhoto: {
    url: String,
    publicId: String
  },
  notes: String
}, {
  timestamps: true
});

foodSchema.index({ location: '2dsphere' });
foodSchema.index({ status: 1, expiryTime: 1 });
foodSchema.index({ donor: 1, createdAt: -1 });

module.exports = mongoose.model('Food', foodSchema);