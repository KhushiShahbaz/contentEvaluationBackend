const mongoose = require("mongoose")

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a team name"],
      trim: true,
      maxlength: [100, "Team name cannot be more than 100 characters"],
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isTeamLead: {
      type: Boolean,
      default: false,
    },
    teamCode: {
      type: String,
      required: true,
      unique: true,
    },
    projectTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Project title cannot be more than 100 characters"],
    },
    projectDescription: {
      type: String,
      maxlength: [1000, "Project description too long"],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    submissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
      },
    ],
    currentRank: {
      type: Number,
      default: null,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    email: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for member count (defensive against undefined members)
TeamSchema.virtual("memberCount").get(function () {
  const membersCount = Array.isArray(this.members) ? this.members.length : 0
  return membersCount + 1 // +1 for the leader
})

// Pre-save middleware to validate team size
TeamSchema.pre("save", function (next) {
  const totalMembers = this.memberCount
  
  if (totalMembers > 5) {
    return next(new Error("Team cannot have more than 5 members (including leader)"))
  }
  
  if (totalMembers < 1) {
    return next(new Error("Team must have at least 1 member (leader)"))
  }
  
  next()
})

// Method to check if team can accept more members
TeamSchema.methods.canAcceptMember = function() {
  return this.memberCount < 5
}

// Method to get available member slots
TeamSchema.methods.getAvailableSlots = function() {
  return Math.max(0, 5 - this.memberCount)
}

module.exports = mongoose.model("Team", TeamSchema)
