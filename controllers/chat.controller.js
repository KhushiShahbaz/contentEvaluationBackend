const Chat = require("../models/chat.model")
const User = require("../models/user.model")

/**
 * @desc    Create a new support chat
 * @route   POST /api/chat/support
 * @access  Private (Team, Evaluator)
 */
exports.createSupportChat = async (req, res) => {
  try {
    const { title, description, category, priority, userType } = req.body

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Chat title is required"
      })
    }

    // Create support chat with user type
    const chat = await Chat.create({
      participants: [req.user.id],
      chatType: "support",
      title,
      description,
      category: category || "general",
      priority: priority || "medium",
      userType: userType || req.user.role,
      assignedTo: null, // Will be assigned by admin
    })

    await chat.populate("participants", "name email role")

    res.status(201).json({
      success: true,
      data: chat
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating support chat",
      error: error.message
    })
  }
}

/**
 * @desc    Get user's chats
 * @route   GET /api/chat
 * @access  Private
 */
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true
    })
    .populate("participants", "name email role")
    .populate("assignedTo", "name email role")
    .populate("messages.sender", "name email role")
    .sort({ lastMessage: -1 })

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching chats",
      error: error.message
    })
  }
}

/**
 * @desc    Get specific chat
 * @route   GET /api/chat/:id
 * @access  Private
 */
exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate("participants", "name email role")
      .populate("assignedTo", "name email role")
      .populate("messages.sender", "name email role")

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      })
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this chat"
      })
    }

    // Mark messages as read for this user
    await chat.markAsRead(req.user.id)

    res.status(200).json({
      success: true,
      data: chat
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      error: error.message
    })
  }
}

/**
 * @desc    Send message to chat
 * @route   POST /api/chat/:id/message
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { content, messageType, fileUrl } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      })
    }

    const chat = await Chat.findById(req.params.id)

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      })
    }

    // Check if user is participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to send message to this chat"
      })
    }

    // Add message
    await chat.addMessage(req.user.id, content, messageType, fileUrl)

    // Populate for response
    await chat.populate("messages.sender", "name email role")

    res.status(200).json({
      success: true,
      data: chat
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message
    })
  }
}

/**
 * @desc    Get all support chats (Admin only)
 * @route   GET /api/chat/support/all
 * @access  Private (Admin)
 */
exports.getAllSupportChats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access all support chats"
      })
    }

    const chats = await Chat.find({
      chatType: "support",
      isActive: true
    })
    .populate("participants", "name email role")
    .populate("assignedTo", "name email role")
    .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching support chats",
      error: error.message
    })
  }
}

// Get support statistics
exports.getSupportStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access support stats"
      })
    }

    const totalTickets = await Chat.countDocuments({ chatType: "support", isActive: true })
    const activeTickets = await Chat.countDocuments({ chatType: "support", status: "active", isActive: true })
    const resolvedTickets = await Chat.countDocuments({ chatType: "support", status: "resolved", isActive: true })
    const closedTickets = await Chat.countDocuments({ chatType: "support", status: "closed", isActive: true })

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTickets,
          activeTickets,
          resolvedTickets,
          closedTickets
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching support stats",
      error: error.message
    })
  }
}

/**
 * @desc    Assign support chat to admin/evaluator
 * @route   PUT /api/chat/:id/assign
 * @access  Private (Admin)
 */
exports.assignChat = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to assign chats"
      })
    }

    const { assignedTo } = req.body

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Assigned user ID is required"
      })
    }

    const chat = await Chat.findById(req.params.id)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      })
    }

    // Check if assigned user exists and is admin/evaluator
    const assignedUser = await User.findById(assignedTo)
    if (!assignedUser || !["admin", "evaluator"].includes(assignedUser.role)) {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be admin or evaluator"
      })
    }

    chat.assignedTo = assignedTo
    await chat.save()

    await chat.populate("assignedTo", "name email role")

    res.status(200).json({
      success: true,
      data: chat
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error assigning chat",
      error: error.message
    })
  }
}

/**
 * @desc    Update chat status
 * @route   PUT /api/chat/:id/status
 * @access  Private (Admin, Assigned User)
 */
exports.updateChatStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!["active", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      })
    }

    const chat = await Chat.findById(req.params.id)
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      })
    }

    // Check if user is authorized (admin or assigned user)
    if (req.user.role !== "admin" && 
        chat.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update chat status"
      })
    }

    chat.status = status
    await chat.save()

    res.status(200).json({
      success: true,
      data: chat
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating chat status",
      error: error.message
    })
  }
}
