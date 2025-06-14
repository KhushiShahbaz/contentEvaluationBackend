// import SupportTicket from "../models/SupportTicket.js"

// // GET all tickets (Admin)
// export const getAllTickets = async (req, res) => {
//   try {
//     const { status, priority, search, page = 1, limit = 20 } = req.query
//     const query = {}

//     if (status && status !== "all") query.status = status
//     if (priority && priority !== "all") query.priority = priority
//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { lastMessage: { $regex: search, $options: "i" } },
//       ]
//     }

//     const skip = (page - 1) * limit
//     const tickets = await SupportTicket.find(query)
//       .populate("user", "name email role")
//       .populate("assignedAdmin", "name email")
//       .sort({ lastMessageDate: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean()

//     const totalTickets = await SupportTicket.countDocuments(query)

//     const stats = await SupportTicket.aggregate([
//       { $group: { _id: "$status", count: { $sum: 1 } } },
//     ])

//     const statusCounts = { total: totalTickets, open: 0, pending: 0, resolved: 0, closed: 0 }
//     stats.forEach((s) => { statusCounts[s._id] = s.count })

//     res.json({
//       tickets,
//       pagination: { page: Number(page), limit: Number(limit), total: totalTickets },
//       stats: statusCounts,
//     })
//   } catch (error) {
//     console.error("Get tickets error:", error)
//     res.status(500).json({ error: "Failed to fetch support tickets" })
//   }
// }

// // POST create ticket (User)
// export const createTicket = async (req, res) => {
//   try {
//     const user = req.user
//     const { title, message, priority = "medium", category = "general" } = req.body

//     if (!title || !message) {
//       return res.status(400).json({ error: "Title and message are required" })
//     }

//     const ticket = new SupportTicket({
//       title,
//       user: user._id,
//       userType: user.role,
//       priority,
//       category,
//       messages: [{
//         sender: user._id,
//         senderName: user.name,
//         message,
//         isAdmin: user.role === "admin",
//       }],
//       lastMessage: message,
//     })

//     ticket.updateLastMessage()
//     await ticket.save()

//     res.status(201).json({ ticket, message: "Support ticket created successfully" })
//   } catch (error) {
//     console.error("Create ticket error:", error)
//     res.status(500).json({ error: "Failed to create support ticket" })
//   }
// }

// // GET ticket by ID (Admin/User)
// export const getTicketById = async (req, res) => {
//   try {
//     const user = req.user
//     const ticket = await SupportTicket.findById(req.params.id)
//       .populate("user", "name email role")
//       .populate("assignedAdmin", "name email")
//       .populate("messages.sender", "name email role")
//       .lean()

//     if (!ticket) return res.status(404).json({ error: "Ticket not found" })

//     if (user.role !== "admin" && ticket.user._id.toString() !== user._id.toString()) {
//       return res.status(403).json({ error: "Access denied" })
//     }

//     res.json({ ticket })
//   } catch (error) {
//     console.error("Get ticket error:", error)
//     res.status(500).json({ error: "Failed to fetch support ticket" })
//   }
// }

// // PUT update ticket (Admin)
// export const updateTicket = async (req, res) => {
//   try {
//     const { status, priority, assignedAdmin } = req.body
//     const ticket = await SupportTicket.findById(req.params.id)

//     if (!ticket) return res.status(404).json({ error: "Ticket not found" })

//     if (status) {
//       ticket.status = status
//       if (["resolved", "closed"].includes(status)) {
//         ticket.resolvedDate = new Date()
//       }
//     }

//     if (priority) ticket.priority = priority
//     if (assignedAdmin) ticket.assignedAdmin = assignedAdmin

//     await ticket.save()

//     res.json({ ticket, message: "Support ticket updated successfully" })
//   } catch (error) {
//     console.error("Update ticket error:", error)
//     res.status(500).json({ error: "Failed to update support ticket" })
//   }
// }

// // POST send message (Admin/User)
// export const sendMessage = async (req, res) => {
//   try {
//     const user = req.user
//     const { message } = req.body
//     const ticket = await SupportTicket.findById(req.params.id)

//     if (!ticket) return res.status(404).json({ error: "Ticket not found" })
//     if (!message || !message.trim()) return res.status(400).json({ error: "Message content required" })

//     if (user.role !== "admin" && ticket.user.toString() !== user._id.toString()) {
//       return res.status(403).json({ error: "Access denied" })
//     }

//     const newMessage = {
//       sender: user._id,
//       senderName: user.name,
//       message: message.trim(),
//       isAdmin: user.role === "admin",
//       timestamp: new Date(),
//     }

//     ticket.messages.push(newMessage)
//     ticket.updateLastMessage()

//     if (ticket.status === "resolved" && user.role !== "admin") {
//       ticket.status = "open"
//     }

//     await ticket.save()

//     res.json({
//       message: newMessage,
//       ticket: {
//         id: ticket._id,
//         status: ticket.status,
//         lastMessage: ticket.lastMessage,
//         lastMessageDate: ticket.lastMessageDate,
//       },
//     })
//   } catch (error) {
//     console.error("Send message error:", error)
//     res.status(500).json({ error: "Failed to send message" })
//   }
// }

// // GET current user's tickets
// export const getUserTickets = async (req, res) => {
//   try {
//     const user = req.user
//     const { status, page = 1, limit = 10 } = req.query
//     const query = { user: user._id }

//     if (status && status !== "all") query.status = status

//     const skip = (page - 1) * limit
//     const tickets = await SupportTicket.find(query)
//       .populate("assignedAdmin", "name email")
//       .sort({ lastMessageDate: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean()

//     const totalTickets = await SupportTicket.countDocuments(query)

//     res.json({
//       tickets,
//       pagination: { page: Number(page), limit: Number(limit), total: totalTickets },
//     })
//   } catch (error) {
//     console.error("Get user tickets error:", error)
//     res.status(500).json({ error: "Failed to fetch user tickets" })
//   }
// }

// // GET support statistics (Admin)
// export const getSupportStats = async (req, res) => {
//   try {
//     const totalTickets = await SupportTicket.countDocuments()
//     const openTickets = await SupportTicket.countDocuments({ status: "open" })
//     const pendingTickets = await SupportTicket.countDocuments({ status: "pending" })
//     const resolvedTickets = await SupportTicket.countDocuments({ status: "resolved" })

//     const priorityStats = await SupportTicket.aggregate([
//       { $group: { _id: "$priority", count: { $sum: 1 } } },
//     ])

//     const userTypeStats = await SupportTicket.aggregate([
//       { $group: { _id: "$userType", count: { $sum: 1 } } },
//     ])

//     const averageResponseTime = "2.5 hours" // placeholder/mock

//     res.json({
//       overview: {
//         totalTickets,
//         openTickets,
//         pendingTickets,
//         resolvedTickets,
//         averageResponseTime,
//       },
//       priorityBreakdown: priorityStats,
//       userTypeBreakdown: userTypeStats,
//     })
//   } catch (error) {
//     console.error("Get support stats error:", error)
//     res.status(500).json({ error: "Failed to fetch support statistics" })
//   }
// }
