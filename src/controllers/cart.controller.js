const {
  listCartItems,
  addOrIncrementCartItem,
  setCartItemQuantity,
  removeCartItem,
  clearCart,
} = require("../services/cart.service");

async function getCart(req, res, next) {
  try {
    const items = await listCartItems(req.user.userId);
    res.status(200).json({
      success: true,
      message: "Sepet getirildi",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function addCartItem(req, res, next) {
  try {
    const items = await addOrIncrementCartItem({
      userId: req.user.userId,
      productId: req.body?.productId,
      quantity: req.body?.quantity,
    });
    res.status(200).json({
      success: true,
      message: "Sepet guncellendi",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCartItemQuantity(req, res, next) {
  try {
    const items = await setCartItemQuantity({
      userId: req.user.userId,
      productId: req.params.productId,
      quantity: req.body?.quantity,
    });
    res.status(200).json({
      success: true,
      message: "Sepet guncellendi",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCartItem(req, res, next) {
  try {
    const items = await removeCartItem({
      userId: req.user.userId,
      productId: req.params.productId,
    });
    res.status(200).json({
      success: true,
      message: "Urun sepetten silindi",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function clearUserCart(req, res, next) {
  try {
    const items = await clearCart(req.user.userId);
    res.status(200).json({
      success: true,
      message: "Sepet temizlendi",
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  clearUserCart,
};
