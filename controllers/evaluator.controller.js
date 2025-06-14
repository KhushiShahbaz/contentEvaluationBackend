
const User = require("../models/user.model");
const Submission = require("../models/submission.model");
const Evaluation = require("../models/evaluation.model");
const { successResponse, errorResponse, getPaginationData } = require("../utils/response");
const transporter = require("../utils/nodeMailer")
const Evaluator=require("../models/evaluator.model")

/**
 * @desc    Get all evaluators
 * @route   GET /api/evaluators
 * @access  Private (Admin)
 */
exports.getAllEvaluators = async (req, res) => {
  try {
    // const authResult = await verifyAdminAuth(req)
    // if (authResult.error) return res.status(401).json(authResult)

    const { status, search, page = 1, limit = 10 } = req.query
    const query = { role: "evaluator" }

    if (status === "pending") {
      query.isApproved = false
    } else if (status === "active") {
      query.isApproved = true
      query.isActive = true
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (page - 1) * limit
    const evaluators = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const totalEvaluators = await User.countDocuments(query)

    const evaluatorStats = await Promise.all(
      evaluators.map(async (evaluator) => {
        if (evaluator.isApproved) {
          const assignedEvaluations = await Submission.countDocuments({
            "assignedEvaluators.evaluator": evaluator._id,
          })

          const completedEvaluations = await Evaluation.countDocuments({
            evaluator: evaluator._id,
            status: "submitted",
          })

          const avgScoreResult = await Evaluation.aggregate([
            { $match: { evaluator: evaluator._id, status: "submitted" } },
            { $group: { _id: null, averageScore: { $avg: "$averageScore" } } },
          ])

          const averageScore =
            avgScoreResult.length > 0 ? avgScoreResult[0].averageScore : 0

          return {
            ...evaluator,
            stats: {
              assignedEvaluations,
              completedEvaluations,
              averageScore: Math.round(averageScore * 100) / 100,
              completionRate:
                assignedEvaluations > 0
                  ? (completedEvaluations / assignedEvaluations) * 100
                  : 0,
            },
          }
        }
        return evaluator
      })
    )

    const counts = {
      total: totalEvaluators,
      pending: await User.countDocuments({ role: "evaluator", isApproved: false }),
      active: await User.countDocuments({
        role: "evaluator",
        isApproved: true,
        isActive: true,
      }),
    }

    return res.json(
      successResponse({
        evaluators: evaluatorStats,
        pagination: getPaginationData(page, limit, totalEvaluators),
        counts,
      })
    )
  } catch (error) {
    console.error("Get evaluators error:", error)
    return res.status(500).json(errorResponse("Failed to fetch evaluators"))
  }
}

/**
 * @desc    Invite evaluator
 * @route   POST /api/evaluators/
 * @access  Private (Admin)
 */
exports.inviteEvaluator = async (req, res) => {
  try {
    const { name, email, message } = req.body

    if (!name || !email)
      return res.status(400).json(errorResponse("Name and email are required"))

    const existingUser = await User.findOne({ email })
    if (existingUser)
      return res.status(400).json(errorResponse("User with this email already exists"))

    // Send invitation email
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "You're invited to be an Evaluator",
      html: `
        <p>Dear ${name},</p>
        <p>You have been invited to join our platform as an evaluator.</p>
        <p><strong>Message from Admin:</strong></p>
        <p>${message || "No message provided."}</p>
        <p>Click the link below to get started:</p>
        <a href="https://your-app.com/evaluator-register">Register Here</a>
        <p>Best regards,<br/>Evaluation Team</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    return res.json(successResponse(null, "Invitation sent successfully"))
  } catch (error) {
    console.error("Invite evaluator error:", error)
    return res.status(500).json(errorResponse("Failed to send invitation"))
  }
}


/**
 * @desc    Get evaluator by ID
 * @route   GET /api/evaluators/:id
 * @access  Private (Admin, Evaluator)
 */
exports.getEvaluatorById = async (req, res) => {
  try {
    // const authResult = await verifyAdminAuth(req)
    // if (authResult.error) return res.status(401).json(authResult)

    const { id } = req.params

    const evaluator = await Evaluator.findById(id)
    if (!evaluator) return res.status(404).json(errorResponse("Evaluator not found"))

    if (evaluator.role !== "evaluator")
      return res.status(400).json(errorResponse("User is not an evaluator"))

    const assignedEvaluations = await Submission.countDocuments({
      "assignedEvaluators.evaluator": id,
    })

    const completedEvaluations = await Evaluation.countDocuments({
      evaluator: id,
      status: "submitted",
    })

    const recentEvaluations = await Evaluation.find({
      evaluator: id,
      status: "submitted",
    })
      .populate("submission", "teamName projectTitle")
      .sort({ submittedDate: -1 })
      .limit(5)
      .lean()

    return res.json(
      successResponse({
        evaluator: {
          ...evaluator,
          stats: {
            assignedEvaluations,
            completedEvaluations,
            completionRate:
              assignedEvaluations > 0
                ? (completedEvaluations / assignedEvaluations) * 100
                : 0,
          },
          recentEvaluations,
        },
      })
    )
  } catch (error) {
    console.error("Get evaluator error:", error)
    return res.status(500).json(errorResponse("Failed to fetch evaluator details"))
  }
}


/**
 * @desc    Get active evaluators
 * @route   GET /api/evaluators/active
 * @access  Private (Admin)
 */
exports.getActiveEvaluators = async (req, res) => {
  try {
    const { search } = req.query;

    const query = { approved: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { qualification: { $regex: search, $options: "i" } },
      ];
    }

    const evaluators = await Evaluator.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json(successResponse({ evaluators }));
  } catch (error) {
    console.error("Get active evaluators error:", error);
    return res.status(500).json(errorResponse("Failed to fetch active evaluators"));
  }
};

