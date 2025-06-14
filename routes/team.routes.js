const express = require("express")
const router = express.Router()
const {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} = require("../controllers/team.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

router.route("/").get(protect, getTeams)

router
  .route("/:id")
  .get(protect, getTeam)
  .put(protect, authorize("admin", "team"), updateTeam)
  .delete(protect, authorize("admin"), deleteTeam)

router.route("/:id/members").post(protect, authorize("admin", "team"), addTeamMember)

router.route("/:id/members/:userId").delete(protect, authorize("admin", "team"), removeTeamMember)

module.exports = router
