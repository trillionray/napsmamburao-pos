const mongoose = require("mongoose");

const timelogSchema = new mongoose.Schema(
  { 
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    timeIn: { type: Date, required: false },
    timeOut: { type: Date, required: false },
    totalTime: { type: Number }, // computed on clock-out
    isPaid: { type: Boolean, default: false },
    tasks: [{ type: String, default: [] }],
    correctionStatus: {
      type: String,
      enum: ["none", "filed", "approved", "disapproved"],
      default: "none"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TimeLog", timelogSchema);