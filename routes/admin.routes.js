const express = require("express")
const router = express.Router()
const {
  getDashboardStats,
  approveEvaluator,
  rejectEvaluator,
  getPendingEvaluators,
  getLeaderboard,
  publishLeaderboard,
  getEvaluationProgress,
} = require("../controllers/admin.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// All routes require admin role
router.use(protect)
router.use(authorize("admin"))

router.get("/dashboard", getDashboardStats)
router.get("/evaluators/pending", getPendingEvaluators)
router.put("/evaluators/:id/approve", approveEvaluator)
router.put("/evaluators/:id/reject", rejectEvaluator)
router.get("/leaderboard", getLeaderboard)
router.put("/leaderboard/publish", publishLeaderboard)
router.get("/evaluation-progress", getEvaluationProgress)

module.exports = router
