const express = require("express");
const {
  register,
  login,
  me,
  updateMe,
  adminOnly,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.patch("/me", authMiddleware, updateMe);
router.get("/admin", authMiddleware, roleMiddleware("ADMIN"), adminOnly);


module.exports = router;