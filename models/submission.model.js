const mongoose = require("mongoose")

const SubmissionSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    projectTitle: {
      type: String,
      required: [true, "Please provide a project title"],
      trim: true,
      maxlength: [200, "Project title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a project description"],
      maxlength: [5000, "Description cannot be more than 5000 characters"],
    },
    learningOutcomes: {
      type: String,
      required: [true, "Please provide learning outcomes"],
      maxlength: [2000, "Learning outcomes cannot be more than 2000 characters"],
    },
    videoLink: {
      type: String,
      required: [true, "Please provide a video link"],
      match: [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/,
        "Please provide a valid YouTube or Vimeo link",
      ],
    },
    teamMembers: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "evaluated"],
      default: "pending",
    },
    evaluations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Evaluation",
      },
    ],
    averageScore: {
      type: Number,
      default: 0,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Submission", SubmissionSchema)
