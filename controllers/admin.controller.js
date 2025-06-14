// server/controllers/admin.controller.js
const User = require("../models/user.model");
const Team = require("../models/team.model");
const Submission = require("../models/submission.model");
const Evaluation = require("../models/evaluation.model");
const Evaluator = require("../models/evaluator.model");

/**
 * @desc    Get dashboard stats
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */

exports.getDashboardStats = async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalEvaluators = await User.countDocuments({ role: "evaluator" });
    const pendingEvaluators = await User.countDocuments({ role: "evaluator", isApproved: false });

    const totalSubmissions = await Submission.countDocuments();
    const totalEvaluations = await Evaluation.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalTeams,
        totalUsers,
        totalEvaluators,
        pendingEvaluators,
        totalSubmissions,
        totalEvaluations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};

/**
 * @desc    Get pending evaluators
 * @route   GET /api/admin/evaluators/pending
 * @access  Private (Admin)
 */

exports.getPendingEvaluators = async (req, res) => {
  try {
    const evaluators = await Evaluator.find({ approved: false });

    res.status(200).json({
      success: true,
      count: evaluators.length,
      data: evaluators,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending evaluators",
      error: error.message,
    });
  }
};

/**
 * @desc    Approve evaluator
 * @route   PUT /api/admin/evaluators/:id/approve
 * @access  Private (Admin)
 */

exports.approveEvaluator = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "evaluator" },
      { isApproved: true },
    );
    const evaluator = await Evaluator.findOneAndUpdate(
      { _id: req.params.id,  },
      { approved: true },
    );


    if (!evaluator && !user) {
      return res.status(404).json({
        success: false,
        message: "Evaluator not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Evaluator approved successfully",
      data: evaluator,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving evaluator",
      error: error.message,
    });
  }
};

/**
 * @desc    Reject evaluator
 * @route   PUT /api/admin/evaluators/:id/reject
 * @access  Private (Admin)
 */

exports.rejectEvaluator = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      role: "evaluator",
      isApproved: false,
    });
    const evaluator = await Evaluator.findOneAndDelete({
      _id: req.params.id,
      approved: false,
    });

    if (!evaluator && !user) {
      return res.status(404).json({
        success: false,
        message: "Evaluator not found or already approved",
      });
    }

    res.status(200).json({
      success: true,
      message: "Evaluator rejected and deleted",
      data: evaluator,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting evaluator",
      error: error.message,
    });
  }
};



// testing
/**
 * @desc    Get evaluation progress
 * @route   GET /api/admin/evaluation-progress
 * @access  Private (Admin)
 */
exports.getEvaluationProgress = async (req, res) => {
  try {
    const totalSubmissions = await Submission.countDocuments();
    const evaluatedSubmissions = await Submission.countDocuments({
      evaluations: { $exists: true, $not: { $size: 0 } },
    });

    const progress = totalSubmissions === 0 ? 0 : Math.round((evaluatedSubmissions / totalSubmissions) * 100);

    res.status(200).json({
      success: true,
      data: {
        totalSubmissions,
        evaluatedSubmissions,
        progressPercent: progress,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching evaluation progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Get leaderboard data
 * @route   GET /api/admin/leaderboard
 * @access  Private (Admin)
 */
exports.getLeaderboard = async (req, res) => {
    try {
      // Get all teams with submissions and evaluations
      const teams = await Team.find()
        .populate({
          path: 'submissions',
          populate: {
            path: 'evaluations',
            model: 'Evaluation',
            match: { status: { $in: ['submitted', 'published'] } }
          }
        })
        .select('name averageScore submissions');
      
      // Filter teams with evaluated submissions
      const evaluatedTeams = teams.filter(team => 
        team.submissions.length > 0 && 
        team.submissions.some(sub => sub.evaluations.length > 0)
      );
      
      // Sort by average score
      evaluatedTeams.sort((a, b) => b.averageScore - a.averageScore);
      
      // Assign ranks
      const rankedTeams = evaluatedTeams.map((team, index) => {
        // Update team rank in database
        Team.findByIdAndUpdate(team._id, { currentRank: index + 1 }).exec();
        
        return {
          ...team.toObject(),
          currentRank: index + 1
        };
      });
      
      res.status(200).json({
        success: true,
        count: rankedTeams.length,
        data: rankedTeams
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching leaderboard',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Publish leaderboard
   * @route   PUT /api/admin/leaderboard/publish
   * @access  Private (Admin)
   */
  exports.publishLeaderboard = async (req, res) => {
    try {
      const { isPublished, showTeamNames, showProjectTitles, showDetailedScores, limitToTop } = req.body;
      
      // Update leaderboard settings
      await Setting.findOneAndUpdate(
        { key: 'leaderboard' },
        {
          key: 'leaderboard',
          value: {
            isPublished: isPublished !== undefined ? isPublished : true,
            showTeamNames: showTeamNames !== undefined ? showTeamNames : true,
            showProjectTitles: showProjectTitles !== undefined ? showProjectTitles : true,
            showDetailedScores: showDetailedScores !== undefined ? showDetailedScores : false,
            limitToTop: limitToTop || 0
          }
        },
        { upsert: true, new: true }
      );
      
      res.status(200).json({
        success: true,
        message: isPublished ? 'Leaderboard published successfully' : 'Leaderboard unpublished'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error publishing leaderboard',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Get public leaderboard
   * @route   GET /api/leaderboard
   * @access  Public
   */
  exports.getPublicLeaderboard = async (req, res) => {
    try {
      // Get leaderboard settings
      const settings = await Setting.findOne({ key: 'leaderboard' });
      
      // Check if leaderboard is published
      if (!settings || !settings.value.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Leaderboard is not available'
        });
      }
      
      // Get teams with ranks
      let teams = await Team.find({ currentRank: { $exists: true, $ne: null } })
        .populate({
          path: 'submissions',
          select: 'projectTitle averageScore',
          options: { limit: 1 }
        })
        .select('name currentRank averageScore')
        .sort('currentRank');
      
      // Apply settings
      if (settings.value.limitToTop > 0) {
        teams = teams.slice(0, settings.value.limitToTop);
      }
      
      // Format response based on settings
      const formattedTeams = teams.map(team => {
        const result = {
          rank: team.currentRank,
          score: team.averageScore
        };
        
        if (settings.value.showTeamNames) {
          result.name = team.name;
        }
        
        if (settings.value.showProjectTitles && team.submissions[0]) {
          result.projectTitle = team.submissions[0].projectTitle;
        }
        
        return result;
      });
      
      res.status(200).json({
        success: true,
        settings: settings.value,
        data: formattedTeams
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching public leaderboard',
        error: error.message
      });
    }
  };