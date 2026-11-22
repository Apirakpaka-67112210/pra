const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Dashboard stats: available to authenticated users (admin gets full details)
router.get('/stats', authenticateToken, reportController.getDashboardStats);

module.exports = router;

