const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Food = require('../models/Food');
const User = require('../models/User');

router.get('/dashboard', auth, async (req, res) => {
  try {
    const totalMeals = await Food.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$servings' } } }
    ]);

    const totalDonations = await Food.countDocuments({ status: 'completed' });
    
    const totalDonors = await User.countDocuments({ userType: 'donor' });
    const totalCollectors = await User.countDocuments({ 
      userType: { $in: ['ngo', 'volunteer'] }
    });

    const mealsServed = totalMeals[0]?.total || 0;
    const foodWeightKg = mealsServed * 0.5;
    const co2SavedKg = foodWeightKg * 2.5;

    const recentDonations = await Food.find()
      .populate('donor', 'name organization')
      .populate('assignedTo', 'name organization')
      .sort({ createdAt: -1 })
      .limit(10);

    const topDonors = await User.find({ userType: 'donor' })
      .sort({ 'stats.totalDonations': -1 })
      .limit(5)
      .select('name organization stats rating');

    const monthlyData = await Food.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          count: { $sum: 1 },
          meals: { $sum: '$servings' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const userStats = await User.findById(req.userId).select('stats rating badges');

    res.json({
      success: true,
      analytics: {
        totalMeals: mealsServed,
        totalDonations,
        totalDonors,
        totalCollectors,
        foodWeightKg: Math.round(foodWeightKg),
        co2SavedKg: Math.round(co2SavedKg),
        recentDonations,
        topDonors,
        monthlyTrends: monthlyData,
        userStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

router.get('/impact', async (req, res) => {
  try {
    const completedPickups = await Food.find({ status: 'completed' });

    const totalServings = completedPickups.reduce((sum, food) => sum + food.servings, 0);
    const foodWeightKg = totalServings * 0.5;
    const co2SavedKg = foodWeightKg * 2.5;
    const waterSavedLiters = foodWeightKg * 1000;

    res.json({
      success: true,
      impact: {
        mealsServed: totalServings,
        foodSavedKg: Math.round(foodWeightKg),
        co2SavedKg: Math.round(co2SavedKg),
        waterSavedLiters: Math.round(waterSavedLiters),
        peopleHelped: Math.round(totalServings / 3)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch impact metrics',
      error: error.message
    });
  }
});

module.exports = router;