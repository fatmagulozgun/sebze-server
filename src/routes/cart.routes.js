const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  clearUserCart,
} = require("../controllers/cart.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCart);
router.post("/items", addCartItem);
router.patch("/items/:productId", updateCartItemQuantity);
router.delete("/items/:productId", deleteCartItem);
router.delete("/", clearUserCart);

module.exports = router;
