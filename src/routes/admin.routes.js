const express = require("express");
const {
  getCategoriesList,
  getUnitsList,
  deleteCategoryItem,
  deleteUnitItem,
  getCustomersList,
  getDashboard,
  getNotificationsList,
  getUnreadNotifications,
} = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.get("/dashboard", authMiddleware, roleMiddleware("ADMIN"), getDashboard);
router.get("/customers", authMiddleware, roleMiddleware("ADMIN"), getCustomersList);
router.get("/categories", authMiddleware, roleMiddleware("ADMIN"), getCategoriesList);
router.get("/units", authMiddleware, roleMiddleware("ADMIN"), getUnitsList);
router.delete("/categories/:id", authMiddleware, roleMiddleware("ADMIN"), deleteCategoryItem);
router.delete("/units/:id", authMiddleware, roleMiddleware("ADMIN"), deleteUnitItem);
router.get("/notifications", authMiddleware, roleMiddleware("ADMIN"), getNotificationsList);
router.get("/notifications/unread", authMiddleware, roleMiddleware("ADMIN"), getUnreadNotifications);

module.exports = router;
