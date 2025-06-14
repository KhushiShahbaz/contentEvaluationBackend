const User = require("../models/user.model")
const Team = require("../models/team.model")
const crypto = require("crypto")
const sendMail = require("../utils/index")
const generateTeamCode = require("../utils/generateTeamCode")
const Evaluator= require("../models/evaluator.model")

// @desc    Register new user (team lead, team member, evaluator)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, role, teamCode, projectTitle, projectDescription,phone, address, isTeamLead, qualification, experience , isApproved} = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already exists" });
  }
  if (!role) {
    return res.status(400).json({ success: false, message: "Role is required" });
  }

  let user;

  if (role === "team") {
    // TEAM REGISTRATION
    if (teamCode) {
      // 👥 Team Member Registration
      const team = await Team.findOne({ teamCode });

      if (!team) {
        return res.status(404).json({ success: false, message: "Team with provided code not found" });
      }

      user = await User.create({
        name,
        email,
        password,
        role,
        isTeamLead,
        team: team._id,
      });

      // Add user to team members
      team.members.push(user._id);
      await team.save();
    } else {
      // 👤 Team Lead Registration
      user = await User.create({
        name,
        email,
        password,
        role,
        
      });

      // Create team with this user as leader
      const teamCode = generateTeamCode(); // Implement this helper to create a unique code
      const team = await Team.create({
        name: `${name}'s Team`,
        leaderId: user._id,
        projectTitle,
        projectDescription,
        teamCode,
        isTeamLead,email
      });

      // Associate team with user
      user.teamId = team._id;
      team.members.push(user._id);
      team.isTeamLead = isTeamLead;
      await user.save();
      await team.save();
    }
  } else if(role === "evaluator"){
    user = await User.create({
      name,
      email,
      password,
      role,
      isApproved: false, // Default: waiting for admin approval
    });

    const evaluator = await Evaluator.create({
      name,
      address,
      qualification,
      experience,
      approved:isApproved, email,phone
    });
    user.evaluatorId = evaluator._id;
    evaluator.approved = isApproved;
    await user.save();
    await evaluator.save();
  }
  else{
    // 🧑‍⚖️ Admin Registration
    user = await User.create({
      name,
      email,
      password,
      role,
      isApproved: true, 
    });
  } 

  sendTokenResponse(user, 200, res);
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      })
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check if evaluator is approved
    if (user.role === "evaluator" && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval",
      })
    }

    sendTokenResponse(user, 200, res)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    })
  }
}

/**
 * @desc    Log user out / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  })
}

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const{role}=req.user
    const user = await User.findById(req.user.id).select("-password")
    let evaluatorData;
if(role==='evaluator'){
evaluatorData= await Evaluator.findById(user.evaluatorId)
}
    // Get team info if user is a team member
    let teamInfo = null
    if (user.teamId) {
      teamInfo = await Team.findById(user.teamId).populate('members', 'name email');

    }

    res.status(200).json({
      success: true,
      data: {
        user,
        team: teamInfo,
        evaluator:evaluatorData
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting user info",
      error: error.message,
    })
  }
}

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id).select("+password")

    // Check current password
    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      })
    }

    user.password = newPassword
    await user.save()

    sendTokenResponse(user, 200, res)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message,
    })
  }
}

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user with that email",
      })
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString("hex")

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // 10 minutes

    await user.save({ validateBeforeSave: false })

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`

    try {
      await sendMail({
        to: user.email,
        subject: "Password reset token",
        message,
      })

      res.status(200).json({
        success: true,
        message: "Email sent",
      })
    } catch (err) {
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined

      await user.save({ validateBeforeSave: false })

      return res.status(500).json({
        success: false,
        message: "Email could not be sent",
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing forgot password",
      error: error.message,
    })
  }
}

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:resetToken
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.resetToken).digest("hex")

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid token",
      })
    }

    // Set new password
    user.password = req.body.password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    sendTokenResponse(user, 200, res)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    })
  }
}

// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      profileImage: req.body.profileImage,
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select("-password")

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    })
  }
}



/**
 * Helper function to get token from model, create cookie and send response
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken()

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), // ✅ Correct key is `expires`
    httpOnly: true,
  }

  // Secure cookie in production
  if (process.env.NODE_ENV === "production") {
    options.secure = true
  }

  // Remove password from output
  user.password = undefined

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user,
  })
}
