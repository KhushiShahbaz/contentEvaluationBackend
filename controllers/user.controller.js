const User = require("../models/user.model");

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Requires auth middleware that sets req.user
    const user = await User.findById(userId)
      .populate("teamId")
      .populate("evaluatorId")
      .select("-password"); // exclude password

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
};
