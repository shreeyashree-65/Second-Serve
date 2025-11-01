const express = require('express');
const router = express.Router();
const { auth, checkUserType } = require('../middleware/auth');
const Food = require('../models/Food');
const { getRedisClient } = require('../config/redis');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

router.post('/create', auth, checkUserType('donor'), async (req, res) => {
  try {
    const {
      title,
      description,
      foodType,
      quantity,
      servings,
      expiryTime,
      pickupWindow,
      location,
      images
    } = req.body;

    const verificationCode = uuidv4().substring(0, 8).toUpperCase();
    const qrCodeUrl = await QRCode.toDataURL(verificationCode);

    const food = new Food({
      donor: req.userId,
      title,
      description,
      foodType,
      quantity,
      servings,
      expiryTime,
      pickupWindow,
      location,
      images,
      verificationCode,
      qrCodeUrl
    });

    await food.save();
    await food.populate('donor', 'name organization phone');

    const redis = getRedisClient();
    if (redis) {
      await redis.setex(
        `food:${food._id}`,
        3600,
        JSON.stringify(food)
      );
    }

    const io = req.app.get('io');
    io.emit('new-food-post', {
      food,
      location: food.location.coordinates
    });

    res.status(201).json({
      success: true,
      message: 'Food post created successfully',
      food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create food post',
      error: error.message
    });
  }
});

router.get('/nearby', auth, async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    const foods = await Food.find({
      status: 'available',
      expiryTime: { $gt: new Date() },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
      .populate('donor', 'name organization phone rating')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: foods.length,
      foods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby food posts',
      error: error.message
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(`food:${req.params.id}`);
      if (cached) {
        return res.json({
          success: true,
          food: JSON.parse(cached),
          cached: true
        });
      }
    }

    const food = await Food.findById(req.params.id)
      .populate('donor', 'name organization phone rating')
      .populate('assignedTo', 'name organization phone')
      .populate('requests.user', 'name organization phone');

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found'
      });
    }

    res.json({
      success: true,
      food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch food post',
      error: error.message
    });
  }
});

router.get('/my/posts', auth, checkUserType('donor'), async (req, res) => {
  try {
    const foods = await Food.find({ donor: req.userId })
      .populate('assignedTo', 'name organization phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: foods.length,
      foods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
});

router.put('/:id/cancel', auth, checkUserType('donor'), async (req, res) => {
  try {
    const food = await Food.findOne({
      _id: req.params.id,
      donor: req.userId
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food post not found'
      });
    }

    food.status = 'cancelled';
    await food.save();

    if (food.assignedTo) {
      const io = req.app.get('io');
      io.to(`user-${food.assignedTo}`).emit('pickup-cancelled', {
        foodId: food._id,
        message: 'The donor has cancelled this food post'
      });
    }

    res.json({
      success: true,
      message: 'Food post cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel post',
      error: error.message
    });
  }
});

module.exports = router;