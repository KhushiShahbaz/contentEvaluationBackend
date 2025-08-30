const express = require("express")
const router = express.Router()
const {
  createSupportChat,
  getUserChats,
  getChat,
  sendMessage,
  getAllSupportChats,
  getSupportStats,
  assignChat,
  updateChatStatus,
} = require("../controllers/chat.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// All routes require authentication
router.use(protect)

// Support chat routes
router.route("/support")
  .post(authorize("team", "evaluator"), createSupportChat)

router.route("/support/all")
  .get(authorize("admin"), getAllSupportChats)

router.route("/support/stats")
  .get(authorize("admin"), getSupportStats)

// Chat management routes
router.route("/")
  .get(getUserChats)

router.route("/:id")
  .get(getChat)

router.route("/:id/message")
  .post(sendMessage)

router.route("/:id/assign")
  .put(authorize("admin"), assignChat)

router.route("/:id/status")
  .put(updateChatStatus)

module.exports = router
