const mongoose = require("mongoose")

const EvaluationSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scores: {
      relevance: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      innovation: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      clarity: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      depth: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      engagement: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      techUse: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      scalability: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      ethics: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      practicality: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      videoQuality: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    feedback: {
      type: String,
      required: [true, "Please provide feedback"],
      maxlength: [2000, "Feedback cannot be more than 2000 characters"],
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "published"],
      default: "draft",
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Calculate total and average scores before saving
EvaluationSchema.pre("save", function (next) {
  const scores = this.scores
  const scoreValues = Object.values(scores)

  this.totalScore = scoreValues.reduce((sum, score) => sum + score, 0)
  this.averageScore = this.totalScore / scoreValues.length

  next()
})

module.exports = mongoose.model("Evaluation", EvaluationSchema)
