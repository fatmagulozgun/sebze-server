const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query?.token === "string" ? req.query.token : null;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const token = bearerToken || queryToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Yetkisiz erişim. Token bulunamadı",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Geçersiz veya süresi dolmuş token",
    });
  }
}

module.exports = authMiddleware;