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
      ref: "Evaluator",
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
      // required: [ "Please provide feedback"],
      maxlength: [2000, "Feedback cannot be more than 2000 characters"],
    },
    status: {
      type: String,
      enum: ["draft", "pending", "submitted", "published"],
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

// Define evaluation criteria weights as per project requirements
const CRITERIA_WEIGHTS = {
  relevance: 5,        // 5%
  innovation: 15,      // 15%
  clarity: 10,         // 10%
  depth: 5,            // 5%
  engagement: 25,      // 25%
  techUse: 5,          // 5%
  scalability: 10,     // 10%
  ethics: 5,           // 5%
  practicality: 10,    // 10%
  videoQuality: 10     // 10%
}

// Calculate total and average scores before saving
EvaluationSchema.pre("save", function (next) {
  if (this.scores && typeof this.scores === 'object') {
    const scoreValues = Object.values(this.scores)
    
    // Ensure all scores are valid numbers, default to 0 if not
    const validScores = scoreValues.map(score => {
      const numScore = Number(score)
      return isNaN(numScore) || numScore < 1 || numScore > 10 ? 0 : numScore
    })
    
    // Calculate weighted total score based on criteria weights
    let weightedTotal = 0
    Object.keys(this.scores).forEach(key => {
      if (this.scores[key] && typeof this.scores[key] === 'number' && !isNaN(this.scores[key])) {
        // Convert 1-10 score to percentage based on weight
        const scorePercentage = (this.scores[key] / 10) * CRITERIA_WEIGHTS[key]
        weightedTotal += scorePercentage
      }
    })
    
    this.totalScore = Math.round(weightedTotal * 100) / 100 // Round to 2 decimal places
    this.averageScore = this.totalScore // Since total is already weighted percentage
    
    // Ensure scores are always numbers
    Object.keys(this.scores).forEach(key => {
      if (typeof this.scores[key] !== 'number' || isNaN(this.scores[key])) {
        this.scores[key] = 0
      }
    })
  } else {
    // If no scores, set defaults
    this.totalScore = 0
    this.averageScore = 0
  }
  
  next()
})

// Virtual field to ensure scores are always accessible
EvaluationSchema.virtual('safeScores').get(function() {
  if (!this.scores || typeof this.scores !== 'object') {
    return {
      relevance: 0,
      innovation: 0,
      clarity: 0,
      depth: 0,
      engagement: 0,
      techUse: 0,
      scalability: 0,
      ethics: 0,
      practicality: 0,
      videoQuality: 0
    }
  }
  
  // Return scores with defaults for missing values
  return {
    relevance: this.scores.relevance || 0,
    innovation: this.scores.innovation || 0,
    clarity: this.scores.clarity || 0,
    depth: this.scores.depth || 0,
    engagement: this.scores.engagement || 0,
    techUse: this.scores.techUse || 0,
    scalability: this.scores.scalability || 0,
    ethics: this.scores.ethics || 0,
    practicality: this.scores.practicality || 0,
    videoQuality: this.scores.videoQuality || 0
  }
})

// Virtual field to get criteria weights
EvaluationSchema.virtual('criteriaWeights').get(function() {
  return CRITERIA_WEIGHTS
})

// Virtual field to get weighted scores
EvaluationSchema.virtual('weightedScores').get(function() {
  if (!this.scores || typeof this.scores !== 'object') {
    return {}
  }
  
  const weighted = {}
  Object.keys(this.scores).forEach(key => {
    if (this.scores[key] && typeof this.scores[key] === 'number' && !isNaN(this.scores[key])) {
      weighted[key] = Math.round((this.scores[key] / 10) * CRITERIA_WEIGHTS[key] * 100) / 100
    } else {
      weighted[key] = 0
    }
  })
  
  return weighted
})

// Method to safely get total score (weighted)
EvaluationSchema.methods.getSafeTotalScore = function() {
  if (!this.scores || typeof this.scores !== 'object') {
    return 0
  }
  
  let weightedTotal = 0
  Object.keys(this.scores).forEach(key => {
    if (this.scores[key] && typeof this.scores[key] === 'number' && !isNaN(this.scores[key])) {
      const scorePercentage = (this.scores[key] / 10) * CRITERIA_WEIGHTS[key]
      weightedTotal += scorePercentage
    }
  })
  
  return Math.round(weightedTotal * 100) / 100
}

// Method to safely get average score (weighted)
EvaluationSchema.methods.getSafeAverageScore = function() {
  return this.getSafeTotalScore() // Since total is already weighted percentage
}

// Method to get raw scores (1-10 scale)
EvaluationSchema.methods.getRawScores = function() {
  if (!this.scores || typeof this.scores !== 'object') {
    return {}
  }
  
  const raw = {}
  Object.keys(this.scores).forEach(key => {
    raw[key] = typeof this.scores[key] === 'number' && !isNaN(this.scores[key]) ? this.scores[key] : 0
  })
  
  return raw
}

// Ensure virtual fields are included when converting to JSON
EvaluationSchema.set('toJSON', { virtuals: true })
EvaluationSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model("Evaluation", EvaluationSchema)
