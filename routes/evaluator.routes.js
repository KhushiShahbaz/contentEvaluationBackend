const express = require("express")
const router = express.Router()
const { getAllEvaluators, inviteEvaluator, getEvaluatorById, getActiveEvaluators } = require("../controllers/evaluator.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

router
  .route("/")
  .get(protect, authorize("admin"), getAllEvaluators)
  .post(protect, authorize("admin"), inviteEvaluator)
  
router
  .route("/active/")
  .get(protect, authorize("admin"), getActiveEvaluators)

router
  .route("/:id")
  .get(protect, getEvaluatorById)




module.exports = router
