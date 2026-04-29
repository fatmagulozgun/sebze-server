const {
    registerUser,
    loginUser,
    getCurrentUser,
    updateCurrentUser,
  } = require("../services/auth.service");
  
  async function register(req, res, next) {
    try {
      const { name, email, password } = req.body;
  
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Ad, e-posta ve şifre zorunludur",
        });
      }
  
      const result = await registerUser({ name, email, password });
  
      res.status(201).json({
        success: true,
        message: "Kayıt başarılı",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async function login(req, res, next) {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "E-posta ve şifre zorunludur",
        });
      }
  
      const result = await loginUser({ email, password });
  
      res.status(200).json({
        success: true,
        message: "Giriş başarılı",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async function me(req, res, next) {
    try {
      const user = await getCurrentUser(req.user.userId);
  
      res.status(200).json({
        success: true,
        message: "Kullanıcı bilgisi getirildi",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

async function adminOnly(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      message: "Admin erişimi başarılı",
      data: {
        userId: req.user.userId,
        role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await updateCurrentUser(req.user.userId, {
      phone: req.body?.phone,
      profileImageDataUrl: req.body?.profileImageDataUrl,
    });

    res.status(200).json({
      success: true,
      message: "Kullanıcı bilgisi güncellendi",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
  
  module.exports = {
    register,
    login,
    me,
  adminOnly,
  updateMe,
  };