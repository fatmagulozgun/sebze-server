const express = require("express");
const {
  getProducts,
  getProduct,
  addProduct,
  editProduct,
  removeProduct,
  checkProductDeleteAbility,
  makeProductPassive,
  makeProductActive,
} = require("../controllers/product.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProduct);

router.post("/", authMiddleware, roleMiddleware("ADMIN"), addProduct);
router.patch("/:id", authMiddleware, roleMiddleware("ADMIN"), editProduct);
router.get("/:id/delete-check", authMiddleware, roleMiddleware("ADMIN"), checkProductDeleteAbility);
router.patch("/:id/deactivate", authMiddleware, roleMiddleware("ADMIN"), makeProductPassive);
router.patch("/:id/activate", authMiddleware, roleMiddleware("ADMIN"), makeProductActive);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), removeProduct);

module.exports = router;
