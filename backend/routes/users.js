const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Rating = require('../models/Rating');

router.post('/rate', auth, async (req, res) => {
  try {
    const { foodId, ratedUserId, rating, categories, comment } = req.body;

    const existingRating = await Rating.findOne({
      food: foodId,
      ratedBy: req.userId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this user for this pickup'
      });
    }

    const newRating = new Rating({
      food: foodId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
      rating,
      categories,
      comment
    });

    await newRating.save();

    const allRatings = await Rating.find({ ratedUser: ratedUserId });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await User.findByIdAndUpdate(ratedUserId, {
      'rating.average': avgRating,
      'rating.count': allRatings.length
    });

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
      error: error.message
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const ratings = await Rating.find({ ratedUser: req.params.id })
      .populate('ratedBy', 'name organization')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      user,
      ratings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, organization, phone, fcmToken } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (organization) updates.organization = organization;
    if (phone) updates.phone = phone;
    if (fcmToken) updates.fcmToken = fcmToken;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = router;