const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'meeting_room_booking_super_secret_jwt_key_2026';

/**
 * Middleware: Verify JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Support both "Bearer <token>" and raw token
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบ Access Token กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่ (Forbidden)',
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware: Require Admin Role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึง: ฟังก์ชันนี้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น',
    });
  }
  next();
}

/**
 * Middleware: Optional Token (attaches user if present, proceeds if not)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  JWT_SECRET,
};

