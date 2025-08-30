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
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    videoLink: {
      type: String,
      required: [true, "Please provide a video link"],
      match: [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|drive\.google\.com|dropbox\.com|onedrive\.live\.com|mega\.nz|mediafire\.com|wetransfer\.com)\/.+$/,
        "Please provide a valid video link (YouTube, Vimeo, Dailymotion, Google Drive, Dropbox, OneDrive, Mega, MediaFire, WeTransfer)",
      ],
    },
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
    evaluationDueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Pre-save middleware to validate team size
SubmissionSchema.pre("save", function (next) {
  if (this.teamMembers && this.teamMembers.length > 5) {
    return next(new Error("Team cannot have more than 5 members"))
  }
  
  if (this.teamMembers && this.teamMembers.length < 1) {
    return next(new Error("Team must have at least 1 member"))
  }
  
  next()
})

// Virtual for team size
SubmissionSchema.virtual("teamSize").get(function() {
  return this.teamMembers ? this.teamMembers.length : 0
})

module.exports = mongoose.model("Submission", SubmissionSchema)
