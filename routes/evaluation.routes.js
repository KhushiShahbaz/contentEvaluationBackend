const express = require("express")
const router = express.Router()
const {
  getEvaluations,
  getEvaluation,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  getSubmissionEvaluations,
  getEvaluatorAssignments,
  getTeamEvaluations,
  publishEvaluation,
  exportEvaluationReport,
} = require("../controllers/evaluation.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// Specific routes FIRST
router.route("/submission/:submissionId").get(protect, getSubmissionEvaluations)

router.route("/evaluator/assignments").get(protect, authorize("evaluator"), getEvaluatorAssignments)

router.route("/team/:teamId").get(protect, authorize("team"), getTeamEvaluations)

router.route("/:id/publish").put(protect, authorize("admin", "evaluator"), publishEvaluation)

// Export evaluations CSV (Admin only)
router.route("/export").get(protect, authorize("admin"), exportEvaluationReport)

// Then generic :id route
router
  .route("/:id")
  .get(protect, getEvaluation)
  .put(protect, authorize("evaluator"), updateEvaluation)
  .delete(protect, authorize("admin", "evaluator"), deleteEvaluation)

// Root route
router
  .route("/")
  .get(protect, authorize("admin"), getEvaluations)
  .post(protect, authorize("evaluator"), createEvaluation)


module.exports = router
