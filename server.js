const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")
const cookieParser = require("cookie-parser")
const path = require("path")

// Import routes
const authRoutes = require("./routes/auth.routes")
// const userRoutes = require("./routes/user.routes")
const teamRoutes = require("./routes/team.routes")
const evaluatorRoutes = require("./routes/evaluator.routes")
const adminRoutes = require("./routes/admin.routes")
const submissionRoutes = require("./routes/submission.routes")
const evaluationRoutes = require("./routes/evaluation.routes")

// Load environment variables
dotenv.config()

// Initialize express app
const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(cookieParser())

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb+srv://khushishahbaz786:qFdMzXk9ZIMX8uSs@content-evaluation-syst.mtejc4j.mongodb.net/")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
// app.use("/api/users", userRoutes)
app.use("/api/teams", teamRoutes)
app.use("/api/evaluators", evaluatorRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/evaluations", evaluationRoutes)

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")))

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"))
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : "An unexpected error occurred",
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
