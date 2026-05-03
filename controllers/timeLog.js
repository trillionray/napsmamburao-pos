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

module.exports.updateTimeLog = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { timeIn, timeOut, tasks } = req.body;

    const timelog = await TimeLog.findById(timelogId);

    if (!timelog) {
      return res.status(404).json({
        message: "Time log not found"
      });
    }

    // ❌ Prevent editing paid logs
    if (timelog.isPaid) {
      return res.status(400).json({
        message: "Cannot edit a paid time log"
      });
    }

    // ✅ Safely parse dates
    let parsedTimeIn = timelog.timeIn;
    let parsedTimeOut = timelog.timeOut;

    if (timeIn) {
      const d = new Date(timeIn);
      if (isNaN(d)) {
        return res.status(400).json({
          message: "Invalid timeIn format"
        });
      }
      parsedTimeIn = d;
    }

    if (timeOut) {
      const d = new Date(timeOut);
      if (isNaN(d)) {
        return res.status(400).json({
          message: "Invalid timeOut format"
        });
      }
      parsedTimeOut = d;
    }

    // ✅ Validate time order
    if (parsedTimeOut && parsedTimeOut < parsedTimeIn) {
      return res.status(400).json({
        message: "timeOut cannot be earlier than timeIn"
      });
    }

    // ✅ Apply updates
    timelog.timeIn = parsedTimeIn;
    timelog.timeOut = parsedTimeOut;

    // ✅ Update tasks
    if (tasks !== undefined) {
      if (!Array.isArray(tasks)) {
        return res.status(400).json({
          message: "Tasks must be an array"
        });
      }
      timelog.tasks = tasks;
    }

    // ✅ Recompute totalTime
    if (timelog.timeIn && timelog.timeOut) {
      const durationHours =
        (timelog.timeOut - timelog.timeIn) / 1000 / 60 / 60;

      timelog.totalTime = parseFloat(durationHours.toFixed(4));
    } else {
      timelog.totalTime = null;
    }

    // ✅ Audit trail (optional but recommended)
    timelog.editedBy = req.user.id;
    timelog.editedAt = new Date();

    await timelog.save();

    res.status(200).json({
      message: "Time log updated successfully",
      timelog
    });

  } catch (error) {
    console.error("UPDATE TIMELOG ERROR:", error);
    res.status(500).json({
      message: "Failed to update timelog",
      error: error.message
    });
  }
};


module.exports.fileTimeCorrection = async (req, res) => {
  try {
    const { timelogId } = req.params;

    const timelog = await TimeLog.findById(timelogId);

    if (!timelog) {
      return res.status(404).json({
        message: "Time log not found"
      });
    }

    // ❌ Prevent filing if already paid
    if (timelog.isPaid) {
      return res.status(400).json({
        message: "Cannot file correction for paid log"
      });
    }

    // ❌ Prevent duplicate filing
    if (timelog.correctionStatus === "filed") {
      return res.status(400).json({
        message: "Correction already filed"
      });
    }

    timelog.correctionStatus = "filed";
    await timelog.save();

    res.status(200).json({
      message: "Time correction filed",
      timelog
    });

  } catch (error) {
    console.error("FILE CORRECTION ERROR:", error);
    res.status(500).json({
      message: "Failed to file correction",
      error: error.message
    });
  }
};


module.exports.handleTimeCorrection = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { status } = req.body; // expected: "approved" or "disapproved"

    // ✅ Validate input
    if (!["approved", "disapproved"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be 'approved' or 'disapproved'"
      });
    }

    const timelog = await TimeLog.findById(timelogId);

    if (!timelog) {
      return res.status(404).json({
        message: "Time log not found"
      });
    }

    // ❌ Must have a filed request first
    if (timelog.correctionStatus !== "filed") {
      return res.status(400).json({
        message: "No pending correction to process"
      });
    }

    // ❌ Prevent approving paid logs (optional but recommended)
    if (timelog.isPaid) {
      return res.status(400).json({
        message: "Cannot process correction for paid log"
      });
    }

    // ✅ Apply status
    timelog.correctionStatus = status;

    await timelog.save();

    res.status(200).json({
      message: `Time correction ${status}`,
      timelog
    });

  } catch (error) {
    console.error("HANDLE CORRECTION ERROR:", error);
    res.status(500).json({
      message: "Failed to process correction",
      error: error.message
    });
  }
};
