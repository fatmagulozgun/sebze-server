const express = require("express");
const {
  getOrders,
  getOrder,
  createNewOrder,
  patchOrderStatus,
  cancelOrder,
  removeOrder,
} = require("../controllers/order.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getOrders);
router.get("/:id", getOrder);
router.post("/", createNewOrder);
router.patch("/:id/cancel", cancelOrder);
router.delete("/:id", removeOrder);
router.patch("/:id/status", roleMiddleware("ADMIN"), patchOrderStatus);

module.exports = router;
