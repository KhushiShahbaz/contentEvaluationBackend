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

router.get("/", verifyAdminAuth, getAllTickets)
router.post("/", verifyAuth, createTicket)
router.get("/user", verifyAuth, getUserTickets)
router.get("/stats", verifyAdminAuth, getSupportStats)
router.get("/:id", verifyAuth, getTicketById)
router.put("/:id", verifyAdminAuth, updateTicket)
router.post("/:id/message", verifyAuth, sendMessage)

export default router
