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

// Virtual for member count
TeamSchema.virtual("memberCount").get(function () {
  return this.members.length + 1 // +1 for the leader
})

module.exports = mongoose.model("Team", TeamSchema)
