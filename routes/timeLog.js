// [SECTION] Dependencies and Modules
const express = require("express");
const router = express.Router();

const timelogController = require("../controllers/timeLog");
const auth = require("../auth");

const { verify, verifyAdmin } = auth;

// Time In
router.post("/time-in", verify, timelogController.timeIn);

// Time Out
router.post("/time-out", verify, timelogController.timeOut);

// Mark Time Log as Paid (admin only)
router.put("/:timelogId/paid", verify, verifyAdmin, timelogController.markAsPaid);


// Admin: get all logs
router.get("/all", verify, verifyAdmin, timelogController.getAllTimeLogs);

// User: get own logs
router.get("/my", verify, timelogController.getMyTimeLogs);


// [SECTION] Export the router so it can be used in app.js
module.exports = router;
