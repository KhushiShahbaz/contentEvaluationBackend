// server/controllers/submission.controller.js
const User = require("../models/user.model");
const Evaluator=require("../models/evaluator.model")
const Submission = require("../models/submission.model");
const Evaluation = require("../models/evaluation.model");
/**
 * @desc    Create a new submission
 * @route   POST /api/submissions
 * @access  Private (Team)
 */
exports.createSubmission = async (req, res) => {
    try {
      const { projectTitle, description, learningOutcomes, videoLink, teamMembers } = req.body;
      
      // Check if user is part of a team
      console.log(req.user)
      if (!req.user.teamId) {
        return res.status(400).json({
          success: false,
          message: 'You must be part of a team to submit a project'
        });
      }
      
      // Check if team already has a submission
      const existingSubmission = await Submission.findOne({ teamId: req.user.teamId });
      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: 'Your team already has a submission. Please update the existing one.'
        });
      }
      
      // Create submission
      const submission = await Submission.create({
        teamId: req.user.teamId,
        projectTitle,
        description,
        learningOutcomes,
        videoLink,
        teamMembers,
        submittedBy: req.user.id
      });
      
      // Update team with submission
      await Team.findByIdAndUpdate(req.user.teamId, {
        $push: { submissions: submission._id }
      });
      
      res.status(201).json({
        success: true,
        data: submission
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating submission',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Update a submission
   * @route   PUT /api/submissions/:id
   * @access  Private (Team, Admin)
   */
  exports.updateSubmission = async (req, res) => {
    try {
      const { projectTitle, description, learningOutcomes, videoLink, teamMembers } = req.body;
      
      // Find submission
      let submission = await Submission.findById(req.params.id);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
      
      // Check if user is authorized to update
      if (req.user.role !== 'admin' && 
          submission.teamId.toString() !== req.user.teamId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this submission'
        });
      }
      
      // Check if submission is already evaluated
      if (submission.status === 'evaluated' && req.user.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update a submission that has been evaluated'
        });
      }
      
      // Update submission
      submission = await Submission.findByIdAndUpdate(
        req.params.id,
        {
          projectTitle,
          description,
          learningOutcomes,
          videoLink,
          teamMembers,
          status: 'pending' // Reset status if updated
        },
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        data: submission
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating submission',
        error: error.message
      });
    }
  };
  
  /**
   * @desc    Assign evaluator to a submission
   * @route   POST /api/submissions/:id/evaluators/:evaluatorId
   * @access  Private (Admin)
   */
  exports.assignEvaluator = async (req, res) => {
    try {
      // Find submission
      const submission = await Submission.findById(req.params.id);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
      
      // Find evaluator
      const evaluator = await Evaluator.findById(req.params.evaluatorId);
      
      if (!evaluator || evaluator.role !== 'evaluator') {
        return res.status(404).json({
          success: false,
          message: 'Evaluator not found'
        });
      }
      
      // Check if evaluator is already assigned
      const existingEvaluation = await Evaluation.findOne({
        submissionId: submission._id,
        evaluatorId: evaluator._id
      });
      
      if (existingEvaluation) {
        return res.status(400).json({
          success: false,
          message: 'Evaluator is already assigned to this submission'
        });
      }
      
      // Create evaluation assignment
      const evaluation = await Evaluation.create({
        submissionId: submission._id,
        evaluatorId: evaluator._id,
        status: 'draft',
        scores: {
          relevance: 5,
          innovation: 5,
          clarity: 5,
          depth: 5,
          engagement: 5,
          techUse: 5,
          scalability: 5,
          ethics: 5,
          practicality: 5,
          videoQuality: 5
        },
        feedback: ''
      });
      
      // Update submission with evaluation
      submission.evaluations.push(evaluation._id);
      await submission.save();
      
      res.status(200).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error assigning evaluator',
        error: error.message
      });
    }
  };

  exports.getSubmissions = async (req, res) => {
    try {
      const submissions = await Submission.find()
        .populate('teamId', 'name members')
        .populate({
          path: 'evaluations',
          populate: {
            path: 'evaluatorId',
            select: 'name email'
          }
        });
  
      res.status(200).json({
        success: true,
        count: submissions.length,
        data: submissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching submissions',
        error: error.message
      });
    }
  };

  exports.getSubmission = async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id)
        .populate('teamId', 'name')
        .populate({
          path: 'evaluations',
          populate: {
            path: 'evaluatorId',
            select: 'name email'
          }
        });
  
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
  
      res.status(200).json({
        success: true,
        data: submission
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching submission',
        error: error.message
      });
    }
  };

  exports.deleteSubmission = async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id);
  
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }
  
      // Authorization check
      if (
        req.user.role !== 'admin' &&
        submission.teamId.toString() !== req.user.teamId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this submission'
        });
      }
  
      await submission.deleteOne();
  
      res.status(200).json({
        success: true,
        message: 'Submission deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting submission',
        error: error.message
      });
    }
  };

  
  exports. getTeamSubmissions = async (req, res) => {
    try {
      const submissions = await Submission.find({ teamId: req.params.teamId })
        .populate({
          path: 'evaluations',
          populate: {
            path: 'evaluatorId',
            select: 'name'
          }
        });
  
      res.status(200).json({
        success: true,
        count: submissions.length,
        data: submissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching team submissions',
        error: error.message
      });
    }
  };
  

  exports.getAllSubmissions = async (req, res) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query
      const query = {}
  
      if (status && status !== "all") {
        query.status = status
      }
  
      if (search) {
        query.$or = [
          { teamName: { $regex: search, $options: "i" } },
          { projectTitle: { $regex: search, $options: "i" } },
        ]
      }
  
      const skip = (page - 1) * limit
  
      const submissions = await Submission.find(query)
        .populate("teamLead", "name email")
        .populate("assignedEvaluators.evaluator", "name email")
        .sort({ submissionDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
  
      const totalSubmissions = await Submission.countDocuments(query)
  
      const stats = await Submission.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
  
      const statusCounts = {
        total: totalSubmissions,
        "pending-assignment": 0,
        assigned: 0,
        "under-review": 0,
        completed: 0,
      }
  
      stats.forEach((stat) => {
        statusCounts[stat._id] = stat.count
      })
  
      res.json({
        submissions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalSubmissions,
          totalPages: Math.ceil(totalSubmissions / limit),
        },
        stats: statusCounts,
      })
    } catch (error) {
      console.error("Get submissions error:", error)
      res.status(500).json({ error: "Failed to fetch submissions" })
    }
  }


  /**
   * Update team submission
   */
  exports.updateTeamSubmission = async (req, res) => {
    try {
      const { _id } = req.user
      const {
        teamName,
        projectTitle,
        description,
        learningOutcomes,
        videoLink,
        technicalDetails,
        tags,
      } = req.body
  
      const submission = await Submission.findOneAndUpdate(
        { teamId: _id },
        {
          $set: {
            teamName,
            projectTitle,
            description,
            learningOutcomes,
            videoLink,
            technicalDetails,
            tags,
          },
        },
        { new: true }
      )
  
      if (!submission) {
        return res.status(404).json({ error: "Submission not found for update" })
      }
  
      res.json({ submission, message: "Submission updated successfully" })
    } catch (error) {
      console.error("Update team submission error:", error)
      res.status(500).json({ error: "Failed to update submission" })
    }
  }
  

  
  /**
   * Export submissions data
   */
  exports.exportSubmissions = async (req, res) => {
    try {
      const submissions = await Submission.find({})
        .populate("teamLead", "name email")
        .populate("assignedEvaluators.evaluator", "name email")
        .lean()
  
      const csvData = submissions.map((s) => ({
        Team: s.teamName,
        ProjectTitle: s.projectTitle,
        Description: s.description,
        VideoLink: s.videoLink,
        Status: s.status,
        AssignedEvaluators: s.assignedEvaluators.map((e) => e.evaluator?.email).join(", "),
      }))
  
      // Convert to CSV
      const csv = [
        "Team,ProjectTitle,Description,VideoLink,Status,AssignedEvaluators",
        ...csvData.map((row) =>
          [row.Team, row.ProjectTitle, row.Description, row.VideoLink, row.Status, row.AssignedEvaluators]
            .map((field) => `"${field}"`)
            .join(",")
        ),
      ].join("\n")
  
      res.header("Content-Type", "text/csv")
      res.attachment("submissions.csv")
      res.send(csv)
    } catch (error) {
      console.error("Export submissions error:", error)
      res.status(500).json({ error: "Failed to export submissions" })
    }
  }
  
