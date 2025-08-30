const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, "Message cannot be more than 1000 characters"],
  },
  messageType: {
    type: String,
    enum: ["text", "file", "image"],
    default: "text",
  },
  fileUrl: {
    type: String,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Support for legacy support ticket fields
  senderName: { type: String }, // For backward compatibility
  isAdmin: { type: Boolean, default: false }, // For backward compatibility
})

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    chatType: {
      type: String,
      enum: ["support", "team", "evaluator"],
      default: "support",
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, "Chat title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    // Support ticket specific fields
    userType: { 
      type: String, 
      enum: ["team", "evaluator", "admin", "user"], 
      default: "user" 
    },
    assignedAdmin: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },
    status: {
      type: String,
      enum: ["active", "resolved", "closed"],
      default: "active",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: {
      type: String,
      enum: ["technical", "submission", "evaluation", "general"],
      default: "general",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    messages: [MessageSchema],
    lastMessage: {
      type: Date,
      default: Date.now,
    },
    lastMessageDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient querying
ChatSchema.index({ participants: 1, lastMessage: -1 })
ChatSchema.index({ status: 1, priority: 1 })
ChatSchema.index({ chatType: 1, category: 1 })

// Virtual for unread message count
ChatSchema.virtual("unreadCount").get(function() {
  if (!this.messages) return 0
  return this.messages.filter(msg => !msg.isRead).length
})

// Method to add message
ChatSchema.methods.addMessage = function(senderId, content, messageType = "text", fileUrl = null) {
  const message = {
    sender: senderId,
    content,
    messageType,
    fileUrl,
    timestamp: new Date(),
  }
  
  this.messages.push(message)
  this.lastMessage = new Date()
  
  return this.save()
}

// Method to mark messages as read
ChatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(msg => {
    if (msg.sender.toString() !== userId.toString()) {
      msg.isRead = true
    }
  })
  
  return this.save()
}

// Method to update last message (from support ticket model)
ChatSchema.methods.updateLastMessage = function() {
  if (this.messages && this.messages.length > 0) {
    const latest = this.messages[this.messages.length - 1]
    this.lastMessage = latest.content
    this.lastMessageDate = latest.timestamp || new Date()
  }
  return this.save()
}

// Pre-save middleware to ensure participants are unique
ChatSchema.pre("save", function(next) {
  if (this.participants) {
    this.participants = [...new Set(this.participants.map(p => p.toString()))]
  }
  next()
})

module.exports = mongoose.model("Chat", ChatSchema)
