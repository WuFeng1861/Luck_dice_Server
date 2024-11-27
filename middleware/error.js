module.exports = (err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || '服务器内部错误'
    }
  });
}; 