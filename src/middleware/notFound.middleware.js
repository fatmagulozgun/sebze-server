function notFoundMiddleware(req, res, next) {
    res.status(404).json({
      success: false,
      message: "Endpoint bulunamadı"
    });
  }
  
  module.exports = notFoundMiddleware;