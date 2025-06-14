// server/controllers/evaluation.controller.js
// const auth = require("../middleware/auth.middleware.js");
const User = require("../models/user.model");
const Submission = require("../models/submission.model");
const Evaluation = require("../models/evaluation.model");
/**
 * @desc    Get evaluator assignments
 * @route   GET /api/evaluations/evaluator/assignments
 * @access  Private (Evaluator)
 */
exports.getEvaluatorAssignments = async (req, res) => {
    try {
      // Find evaluations assigned to this evaluator
      const evaluations = await Evaluation.find({ evaluatorId: req.user.id })
        .populate({
          path: 'submissionId',
          select: 'projectTitle teamId videoLink status',
          populate: {
            path: 'teamId',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 });
      
      // Separate by status
      const pending = evaluations.filter(evaluation => evaluation.status === 'draft');
      const completed = evaluations.filter(evaluation => evaluation.status === 'submitted' || evaluation.status === 'published');
      
      res.status(200).json({
        success: true,
        data: {
          pending,
          completed,
          count: evaluations.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching evaluator assignments',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Create or update an evaluation
   * @route   PUT /api/evaluations/:id
   * @access  Private (Evaluator)
   */
  exports.updateEvaluation = async (req, res) => {
    try {
      const { scores, feedback, status } = req.body;
      
      // Find evaluation
      let evaluation = await Evaluation.findById(req.params.id);
      
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Check if user is authorized to update
      if (evaluation.evaluatorId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this evaluation'
        });
      }
      
      // Check if evaluation is already published
      if (evaluation.status === 'published') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update a published evaluation'
        });
      }
      
      // Update evaluation
      evaluation = await Evaluation.findByIdAndUpdate(
        req.params.id,
        {
          scores,
          feedback,
          status: status || 'draft'
        },
        { new: true, runValidators: true }
      );
      
      // If status is submitted, update submission average score
      if (status === 'submitted') {
        const submission = await Submission.findById(evaluation.submissionId);
        
        // Get all completed evaluations for this submission
        const completedEvaluations = await Evaluation.find({
          submissionId: submission._id,
          status: { $in: ['submitted', 'published'] }
        });
        
        // Calculate average score
        const totalScore = completedEvaluations.reduce((sum, evaluation) => sum + evaluation.averageScore, 0);
        const averageScore = totalScore / completedEvaluations.length;
        
        // Update submission
        submission.averageScore = averageScore;
        
        // If all evaluations are complete, update status
        if (completedEvaluations.length === submission.evaluations.length) {
          submission.status = 'evaluated';
        }
        
        await submission.save();
        
        // Update team average score
        const team = await Team.findById(submission.teamId);
        team.averageScore = averageScore;
        await team.save();
      }
      
      res.status(200).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating evaluation',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Publish an evaluation
   * @route   PUT /api/evaluations/:id/publish
   * @access  Private (Admin, Evaluator)
   */
  exports.publishEvaluation = async (req, res) => {
    try {
      // Find evaluation
      let evaluation = await Evaluation.findById(req.params.id);
      
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
      
      // Check if user is authorized to publish
      if (req.user.role !== 'admin' && evaluation.evaluatorId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to publish this evaluation'
        });
      }
      
      // Check if evaluation is in submitted status
      if (evaluation.status !== 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'Only submitted evaluations can be published'
        });
      }
      
      // Update evaluation status
      evaluation = await Evaluation.findByIdAndUpdate(
        req.params.id,
        { status: 'published' },
        { new: true }
      );
      
      res.status(200).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error publishing evaluation',
        error: error.message
      });
    }
  };


  exports.getEvaluations = async (req, res) => {
    try {
      const evaluations = await Evaluation.find()
        .populate('submissionId', 'projectTitle')
        .populate('evaluatorId', 'name email');
  
      res.status(200).json({
        success: true,
        count: evaluations.length,
        data: evaluations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching evaluations',
        error: error.message
      });
    }
  };
  exports.getEvaluation = async (req, res) => {
    try {
      const evaluation = await Evaluation.findById(req.params.id)
        .populate('submissionId', 'projectTitle')
        .populate('evaluatorId', 'name email');
  
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
  
      res.status(200).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching evaluation',
        error: error.message
      });
    }
  };

  
  exports.createEvaluation = async (req, res) => {
    try {
      const { submissionId, scores, feedback, status } = req.body;
  
      const existing = await Evaluation.findOne({
        submissionId,
        evaluatorId: req.user.id
      });
  
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Evaluation for this submission already exists'
        });
      }
  
      const evaluation = await Evaluation.create({
        submissionId,
        evaluatorId: req.user.id,
        scores,
        feedback,
        status: status || 'draft'
      });
  
      res.status(201).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating evaluation',
        error: error.message
      });
    }
  };

  
  exports.deleteEvaluation = async (req, res) => {
    try {
      const evaluation = await Evaluation.findById(req.params.id);
  
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
  
      if (
        req.user.role !== 'admin' &&
        evaluation.evaluatorId.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this evaluation'
        });
      }
  
      await evaluation.remove();
  
      res.status(200).json({
        success: true,
        message: 'Evaluation deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting evaluation',
        error: error.message
      });
    }
  };

  
  exports.getSubmissionEvaluations = async (req, res) => {
    try {
      const evaluations = await Evaluation.find({
        submissionId: req.params.submissionId
      }).populate('evaluatorId', 'name');
  
      res.status(200).json({
        success: true,
        count: evaluations.length,
        data: evaluations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching submission evaluations',
        error: error.message
      });
    }
  };
  



// 1. GET Evaluation Summary (Admin Only)
exports.getEvaluationSummary = async (req, res) => {
  try {
    // const { user, error } = await auth.(req);
    if (error) return res.status(401).json(errorResponse(error));

    const totalSubmissions = await Submission.countDocuments();
    const completedEvaluations = await Submission.countDocuments({ evaluationStatus: "completed" });
    const pendingEvaluations = await Submission.countDocuments({
      evaluationStatus: { $in: ["not-started", "in-progress"] },
    });

    const avgScoreResult = await Submission.aggregate([
      { $match: { averageScore: { $ne: null } } },
      { $group: { _id: null, averageScore: { $avg: "$averageScore" } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].averageScore * 100) / 100 : 0;

    const teamEvaluations = await Submission.find()
      .populate("teamLead", "name email")
      .populate("assignedEvaluators.evaluator", "name email")
      .sort({ submissionDate: -1 })
      .lean();

    const evaluatorPerformance = await User.aggregate([
      {
        $match: {
          role: "evaluator",
          isApproved: true,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "submissions",
          localField: "_id",
          foreignField: "assignedEvaluators.evaluator",
          as: "assignedSubmissions",
        },
      },
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "evaluator",
          as: "completedEvaluations",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          assignedCount: { $size: "$assignedSubmissions" },
          completedCount: { $size: "$completedEvaluations" },
          averageScore: {
            $cond: {
              if: { $gt: [{ $size: "$completedEvaluations" }, 0] },
              then: { $avg: "$completedEvaluations.averageScore" },
              else: 0,
            },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: {
              if: { $gt: ["$assignedCount", 0] },
              then: { $multiply: [{ $divide: ["$completedCount", "$assignedCount"] }, 100] },
              else: 0,
            },
          },
        },
      },
    ]);

    const criteriaBreakdown = await Evaluation.aggregate([
      { $unwind: "$criteriaScores" },
      {
        $group: {
          _id: "$criteriaScores.criteriaName",
          averageScore: { $avg: "$criteriaScores.score" },
          count: { $sum: 1 },
        },
      },
      { $sort: { averageScore: -1 } },
    ]);

    const evaluationProgress = totalSubmissions > 0 ? (completedEvaluations / totalSubmissions) * 100 : 0;

    return res.json(
      successResponse({
        summary: {
          totalSubmissions,
          completedEvaluations,
          pendingEvaluations,
          averageScore,
          evaluationProgress: Math.round(evaluationProgress * 100) / 100,
        },
        teamEvaluations: teamEvaluations.map((submission) => ({
          id: submission._id,
          teamName: submission.teamName,
          project: submission.projectTitle,
          submissionDate: submission.submissionDate,
          evaluatorsAssigned: submission.assignedEvaluators.length,
          evaluationsCompleted: submission.assignedEvaluators.filter((e) => e.status === "completed").length,
          averageScore: submission.averageScore,
          status: submission.evaluationStatus,
          evaluators: submission.assignedEvaluators.map((e) => e.evaluator?.name || "Unknown"),
        })),
        evaluatorPerformance: evaluatorPerformance.map((evaluator) => ({
          id: evaluator._id,
          name: evaluator.name,
          assignedEvaluations: evaluator.assignedCount,
          completedEvaluations: evaluator.completedCount,
          averageScore: Math.round(evaluator.averageScore * 100) / 100,
          completionRate: Math.round(evaluator.completionRate * 100) / 100,
          averageTimePerEvaluation: "2.5 hours", // Placeholder
        })),
        criteriaBreakdown: criteriaBreakdown.map((criteria) => ({
          name: criteria._id,
          score: Math.round(criteria.averageScore * 100) / 100,
          count: criteria.count,
        })),
      })
    );
  } catch (err) {
    console.error("Evaluation Summary Error:", err);
    return res.status(500).json(errorResponse("Failed to fetch evaluation summary"));
  }
};



exports.submitEvaluation = async (req, res) => {
  try {
    // const { user, error } = await verifyEvaluatorAuth(req);
    if (error) return res.status(401).json(errorResponse(error));

    const { submissionId, criteriaScores, comments } = req.body;

    if (!submissionId || !criteriaScores || !Array.isArray(criteriaScores)) {
      return res.status(400).json(errorResponse("Invalid evaluation data"));
    }

    // Check if the submission exists and evaluator is assigned
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json(errorResponse("Submission not found"));

    const assigned = submission.assignedEvaluators.find(
      (e) => e.evaluator.toString() === user._id.toString()
    );
    if (!assigned) return res.status(403).json(errorResponse("Not assigned to this submission"));

    // Check if already evaluated
    const alreadyEvaluated = await Evaluation.findOne({
      evaluator: user._id,
      submission: submissionId,
    });
    if (alreadyEvaluated) return res.status(409).json(errorResponse("Already submitted evaluation"));

    // Calculate average score
    const totalScore = criteriaScores.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = totalScore / criteriaScores.length;

    const evaluation = new Evaluation({
      evaluator: user._id,
      submission: submissionId,
      criteriaScores,
      comments,
      averageScore,
    });

    await evaluation.save();

    // Update submission's evaluation status
    assigned.status = "completed";
    await submission.save();

    // Update submission average score if all evaluations are completed
    const pending = submission.assignedEvaluators.filter((e) => e.status !== "completed");
    if (pending.length === 0) {
      const allEvaluations = await Evaluation.find({ submission: submissionId });
      const total = allEvaluations.reduce((sum, e) => sum + e.averageScore, 0);
      const avg = total / allEvaluations.length;

      submission.evaluationStatus = "completed";
      submission.averageScore = Math.round(avg * 100) / 100;
      await submission.save();
    } else {
      submission.evaluationStatus = "in-progress";
      await submission.save();
    }

    return res.json(successResponse({ message: "Evaluation submitted successfully" }));
  } catch (err) {
    console.error("Submit Evaluation Error:", err);
    return res.status(500).json(errorResponse("Failed to submit evaluation"));
  }
};


exports.getEvaluationDetails = async (req, res) => {
  try {
    // const { user, error } = await verifyEvaluatorAuth(req);
    if (error) return res.status(401).json(errorResponse(error));

    const { submissionId } = req.params;

    const evaluation = await Evaluation.findOne({
      evaluator: user._id,
      submission: submissionId,
    });

    if (!evaluation)
      return res.status(404).json(errorResponse("Evaluation not found"));

    return res.json(successResponse(evaluation));
  } catch (err) {
    console.error("Evaluation Details Error:", err);
    return res.status(500).json(errorResponse("Failed to fetch evaluation details"));
  }
};


exports.exportEvaluationReport = async (req, res) => {
  try {
    // const { user, error } = await verifyAdminAuth(req);
    if (error) return res.status(401).json(errorResponse(error));

    const evaluations = await Evaluation.find()
      .populate("evaluator", "name email")
      .populate("submission", "teamName projectTitle");

    const csvRows = [
      ["Evaluator", "Email", "Team", "Project", "Average Score", "Comments"],
      ...evaluations.map((e) => [
        e.evaluator?.name || "N/A",
        e.evaluator?.email || "N/A",
        e.submission?.teamName || "N/A",
        e.submission?.projectTitle || "N/A",
        e.averageScore,
        (e.comments || "").replace(/[\n\r]/g, " "),
      ]),
    ];

    const csv = csvRows.map((row) => row.join(",")).join("\n");

    res.setHeader("Content-disposition", "attachment; filename=evaluation-report.csv");
    res.set("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error("Export Report Error:", err);
    return res.status(500).json(errorResponse("Failed to export evaluation report"));
  }
};
