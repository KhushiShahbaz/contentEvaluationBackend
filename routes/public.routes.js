const express = require("express")
const router = express.Router()
const { getPublicLeaderboard } = require("../controllers/admin.controller")

// Public endpoints (no auth)
router.get("/leaderboard", getPublicLeaderboard)

module.exports = router

