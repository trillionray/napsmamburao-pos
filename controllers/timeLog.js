const TimeLog = require("../models/TimeLog");

module.exports.timeIn = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

    const activeLog = await TimeLog.findOne({
      userId,
      timeOut: null
    });

    if (activeLog) {
      return res.status(400).json({
        message: "User already clocked in."
      });
    }

    const newLog = await TimeLog.create({
      userId,
      timeIn: new Date(),
      tasks
    });

    return res.status(201).json({
      message: "Clock In successful",
      timelog: newLog
    });

  } catch (error) {
    console.error("TIME IN ERROR:", error); // 🔥 important
    return res.status(500).json({
      message: "Time in failed",
      error: error.message
    });
  }
};



module.exports.timeOut = async (req, res) => {
  try {
    const timelog = await TimeLog.findOne({
      userId: req.user.id,
      timeOut: null
    }).sort({ timeIn: -1 });

    if (!timelog) {
      return res.status(400).json({
        message: "No open time log found"
      });
    }

    timelog.timeOut = new Date();

    // compute totalTime in hours with 4 decimals
    const durationHours = (timelog.timeOut - timelog.timeIn) / 1000 / 60 / 60; // ms → hours
    timelog.totalTime = parseFloat(durationHours.toFixed(4)); // e.g., 0.0167 for 1 min

    await timelog.save();

    res.status(200).json({
      message: "Time out recorded",
      timelog
    });
  } catch (error) {
    res.status(500).json({
      message: "Time out failed",
      error: error.message
    });
  }
};




module.exports.markAsPaid = async (req, res) => {
  try {
    const { timelogId } = req.params;

    const timelog = await TimeLog.findByIdAndUpdate(
      timelogId,
      { isPaid: true },
      { new: true }
    );

    if (!timelog) {
      return res.status(404).json({
        message: "Time log not found"
      });
    }

    res.status(200).json({
      message: "Time log marked as paid",
      timelog
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update payment status",
      error: error.message
    });
  }
};


module.exports.getMyTimeLogs = async (req, res) => {
  try {
    const timelogs = await TimeLog.find({
      userId: req.user.id
    }).sort({ timeIn: -1 });

    res.status(200).json({
      timelogs
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch time logs",
      error: error.message
    });
  }
};



module.exports.getAllTimeLogs = async (req, res) => {
  try {
    const timelogs = await TimeLog.find()
      .populate("userId", "name email")
      .sort({ timeIn: -1 });

    res.status(200).json({
      timelogs
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch time logs",
      error: error.message
    });
  }
};


module.exports.updateTasks = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        message: "Tasks must be an array"
      });
    }

    const timelog = await TimeLog.findById(timelogId);

    if (!timelog) {
      return res.status(404).json({
        message: "Time log not found"
      });
    }

    // optional: prevent editing if already clocked out
    if (timelog.timeOut) {
      return res.status(400).json({
        message: "Cannot edit tasks after clock out"
      });
    }

    timelog.tasks = tasks;
    await timelog.save();

    return res.status(200).json({
      message: "Tasks updated successfully",
      timelog
    });

  } catch (error) {
    console.error("UPDATE TASKS ERROR:", error);
    return res.status(500).json({
      message: "Failed to update tasks",
      error: error.message
    });
  }
};