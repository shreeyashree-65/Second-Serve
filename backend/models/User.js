const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  userType: {
    type: String,
    enum: ['donor', 'ngo', 'volunteer'],
    required: true
  },
  organization: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  verified: {
    type: Boolean,
    default: false
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  stats: {
    totalDonations: { type: Number, default: 0 },
    totalPickups: { type: Number, default: 0 },
    mealsServed: { type: Number, default: 0 }
  },
  badges: [{
    name: String,
    earnedAt: Date
  }],
  fcmToken: String,
  isActive: {
    type: Boolean,
    default: true
  },
  googleId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);