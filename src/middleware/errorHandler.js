/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Server Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = errorHandler;

