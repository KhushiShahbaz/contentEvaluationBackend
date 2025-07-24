const express = require("express")
const router = express.Router()
const { protect, authorize } = require("../middleware/auth.middleware")
const { getProfile } = require("../controllers/user.controller")

// List all teams
router.route("/:id").get(protect,getProfile )

module.exports = router
