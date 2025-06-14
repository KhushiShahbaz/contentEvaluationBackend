// server/controllers/team.controller.js
const Team = require('../models/team.model');
const User = require('../models/user.model');
/**
 * @desc    Get all teams
 * @route   GET /api/teams
 * @access  Private (Admin, Evaluator)
 */
exports.getTeams = async (req, res) => {
    try {
      const teams = await Team.find()
        .populate('leaderId', 'name email')
        .populate('members', 'name email')
        .select('name leaderId members currentRank averageScore createdAt');
      
      res.status(200).json({
        success: true,
        count: teams.length,
        data: teams
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching teams',
        error: error.message
      });
    }
  };
  

  exports.getTeam = async (req, res) => {
    try {
      const team = await Team.findById(req.params.id)
        // .populate('leaderId', 'name email')
        // .populate('members', 'name email')
        // .select('name leaderId members currentRank averageScore createdAt');
      
        res.status(200).json({
          success: true,
          data: team
        });
        
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching teams',
        error: error.message
      });
    }
  };
  


  
  exports.updateTeam = async (req, res) => {
    try {
      const { name, leaderId, members } = req.body;
      const teamCode = req.params.teamCode;
  
      // Check if team exists
      const team = await Team.findById(teamCode);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }
  
      // Check if leader exists
      const leader = await User.findById(leaderId);
      if (!leader) {
        return res.status(404).json({
          success: false,
          message: "Team leader not found",
        });
      }
  
      // Update the team
      team.name = name || team.name;
      team.leaderId = leaderId || team.leaderId;
      team.members = members || team.members;
  
      await team.save();
  
      // Update leader's teamId
      leader.teamId = team._id;
      await leader.save();
  
      // Update teamId for all members
      if (members && members.length > 0) {
        await User.updateMany(
          { _id: { $in: members } },
          { teamId: team._id }
        );
      }
  
      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating team",
        error: error.message,
      });
    }
  };
  /**
   * @desc    Add a member to a team
   * @route   POST /api/teams/:id/members
   * @access  Private (Admin, Team Lead)
   */
  exports.addTeamMember = async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if user is already in a team
      if (user.teamId) {
        return res.status(400).json({
          success: false,
          message: 'User is already in a team'
        });
      }
      
      // Get team
      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }
      
      // Check if user is trying to add themselves and is not admin
      if (req.user.role !== 'admin' && 
          req.user.id !== team.leaderId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add members to this team'
        });
      }
      
      // Add member to team
      team.members.push(userId);
      await team.save();
      
      // Update user's teamId
      user.teamId = team._id;
      await user.save();
      
      res.status(200).json({
        success: true,
        data: team
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding team member',
        error: error.message
      });
    }
  };



  // Additional controller functions for missing routes in team.controller.js



/**
 * @desc    Delete a team
 * @route   DELETE /api/teams/:id
 * @access  Private (Admin)
 */
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Remove team reference from users
    await User.updateMany(
      { _id: { $in: [team.leaderId, ...team.members] } },
      { $unset: { teamId: '' } }
    );

    // Delete the team
    await team.remove();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting team',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove a member from a team
 * @route   DELETE /api/teams/:id/members/:userId
 * @access  Private (Admin, Team Lead)
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    const userId = req.params.userId;

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== team.leaderId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members from this team',
      });
    }

    const memberIndex = team.members.indexOf(userId);
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of the team',
      });
    }

    // Remove user from team members
    team.members.splice(memberIndex, 1);
    await team.save();

    // Remove teamId from user
    await User.findByIdAndUpdate(userId, { $unset: { teamId: '' } });

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully',
      data: team,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing team member',
      error: error.message,
    });
  }
};
