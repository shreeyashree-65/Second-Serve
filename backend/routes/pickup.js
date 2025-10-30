const express = require('express');
const router = express.Router();
const { auth, checkUserType } = require('../middleware/auth');
const Food = require('../models/Food');
const User = require('../models/User');

// @route   POST /api/pickup/request/:foodId
// @desc    Request to pickup food
// @access  Private (NGO/Volunteer)
router.post('/request/:foodId', auth, checkUserType('ngo', 'volunteer'), async (req, res) => {
  try {
    const food = await Food.findById(req.params.foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found'
      });
    }

    if (food.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'This food is no longer available'
      });
    }

    // Check if already requested
    const alreadyRequested = food.requests.some(
      r => r.user.toString() === req.userId.toString()
    );

    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: 'You have already requested this food'
      });
    }

    food.requests.push({
      user: req.userId,
      requestedAt: new Date(),
      status: 'pending'
    });

    food.status = 'requested';
    await food.save();

    // Notify donor
    const io = req.app.get('io');
    io.to(`user-${food.donor}`).emit('pickup-requested', {
      foodId: food._id,
      requester: {
        id: req.user._id,
        name: req.user.name,
        organization: req.user.organization
      }
    });

    res.json({
      success: true,
      message: 'Pickup request sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request pickup',
      error: error.message
    });
  }
});

// @route   PUT /api/pickup/approve/:foodId/:requesterId
// @desc    Approve pickup request
// @access  Private (Donor)
router.put('/approve/:foodId/:requesterId', auth, checkUserType('donor'), async (req, res) => {
  try {
    const food = await Food.findOne({
      _id: req.params.foodId,
      donor: req.userId
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found'
      });
    }

    const request = food.requests.find(
      r => r.user.toString() === req.params.requesterId
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Approve this request
    request.status = 'approved';

    // Reject all other requests
    food.requests.forEach(r => {
      if (r.user.toString() !== req.params.requesterId) {
        r.status = 'rejected';
      }
    });

    food.status = 'assigned';
    food.assignedTo = req.params.requesterId;
    await food.save();

    // Notify approved collector
    const io = req.app.get('io');
    io.to(`user-${req.params.requesterId}`).emit('pickup-approved', {
      foodId: food._id,
      verificationCode: food.verificationCode,
      qrCodeUrl: food.qrCodeUrl
    });

    // Notify rejected collectors
    food.requests.forEach(r => {
      if (r.status === 'rejected') {
        io.to(`user-${r.user}`).emit('pickup-rejected', {
          foodId: food._id,
          message: 'Another collector was approved for this pickup'
        });
      }
    });

    res.json({
      success: true,
      message: 'Pickup request approved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

// @route   POST /api/pickup/verify/:foodId
// @desc    Verify pickup with code
// @access  Private (NGO/Volunteer)
router.post('/verify/:foodId', auth, checkUserType('ngo', 'volunteer'), async (req, res) => {
  try {
    const { verificationCode } = req.body;

    const food = await Food.findOne({
      _id: req.params.foodId,
      assignedTo: req.userId,
      status: 'assigned'
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found or not assigned to you'
      });
    }

    if (food.verificationCode !== verificationCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    food.status = 'picked-up';
    await food.save();

    // Update user stats
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.totalPickups': 1, 'stats.mealsServed': food.servings }
    });

    await User.findByIdAndUpdate(food.donor, {
      $inc: { 'stats.totalDonations': 1, 'stats.mealsServed': food.servings }
    });

    // Notify donor
    const io = req.app.get('io');
    io.to(`user-${food.donor}`).emit('pickup-verified', {
      foodId: food._id,
      message: 'Food has been picked up successfully'
    });

    res.json({
      success: true,
      message: 'Pickup verified successfully',
      food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify pickup',
      error: error.message
    });
  }
});

// @route   POST /api/pickup/complete/:foodId
// @desc    Complete pickup with proof photo
// @access  Private (NGO/Volunteer)
router.post('/complete/:foodId', auth, checkUserType('ngo', 'volunteer'), async (req, res) => {
  try {
    const { proofPhoto, notes } = req.body;

    const food = await Food.findOne({
      _id: req.params.foodId,
      assignedTo: req.userId,
      status: 'picked-up'
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found'
      });
    }

    food.status = 'completed';
    food.completedAt = new Date();
    food.proofPhoto = proofPhoto;
    food.notes = notes;
    await food.save();

    // Notify donor
    const io = req.app.get('io');
    io.to(`user-${food.donor}`).emit('pickup-completed', {
      foodId: food._id,
      message: 'Food distribution completed'
    });

    res.json({
      success: true,
      message: 'Pickup completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete pickup',
      error: error.message
    });
  }
});

// @route   GET /api/pickup/my-pickups
// @desc    Get user's pickup history
// @access  Private
router.get('/my-pickups', auth, async (req, res) => {
  try {
    const pickups = await Food.find({
      assignedTo: req.userId
    })
      .populate('donor', 'name organization phone rating')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pickups.length,
      pickups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickups',
      error: error.message
    });
  }
});

module.exports = router;