import express from "express"
import {
  getAllTickets,
  createTicket,
  getTicketById,
  updateTicket,
  sendMessage,
  getUserTickets,
  getSupportStats,
} from "../controllers/support.controller.js"
import { verifyAuth, verifyAdminAuth } from "../middleware/auth.middleware.js"

const router = express.Router()

// Specific routes first
router.get("/user", verifyAuth, getUserTickets)
router.get("/stats", verifyAdminAuth, getSupportStats)
router.post("/:id/message", verifyAuth, sendMessage)

// Then generic :id-based routes
router.get("/:id", verifyAuth, getTicketById)
router.put("/:id", verifyAdminAuth, updateTicket)

// Finally base routes
router.get("/", verifyAdminAuth, getAllTickets)
router.post("/", verifyAuth, createTicket)

export default router
