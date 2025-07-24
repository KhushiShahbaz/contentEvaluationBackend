const express = require("express")
const router = express.Router()
const {
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getTeamSubmissions,
  assignEvaluator,
} = require("../controllers/submission.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// Specific routes first
router.route("/team/:teamId").get(protect, authorize("admin", "team", "evaluator"), getTeamSubmissions)

router.route("/:id/evaluators/:evaluatorId").post(protect, authorize("admin"), assignEvaluator)

// Then generic :id route
router
  .route("/:id")
  .get(protect, getSubmission)
  .put(protect, authorize("team", "admin"), updateSubmission)
  .delete(protect, authorize("admin", "team"), deleteSubmission)

// Finally, base route
router
  .route("/")
  .get(protect, authorize("admin", "evaluator"), getSubmissions)
  .post(protect, authorize("team"), createSubmission)

module.exports = router
