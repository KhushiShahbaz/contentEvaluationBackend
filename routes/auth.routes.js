const express = require("express")
const router = express.Router()
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  
} = require("../controllers/auth.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// Public routes
router.post("/register", register)
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.put("/reset-password/:resetToken", resetPassword)

// Protected routes
router.get("/me", protect, getMe)
router.post("/logout", protect, logout)
router.put("/update-password", protect, updatePassword)
router.put("/update-profile", protect, updateProfile)

module.exports = router
