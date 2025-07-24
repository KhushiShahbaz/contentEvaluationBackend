const mongoose = require("mongoose");

const evaluatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },

}, { timestamps: true });

module.exports = mongoose.model("Evaluator", evaluatorSchema);
