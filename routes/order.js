const express = require("express");
const router = express.Router();

const orderController = require("../controllers/order");
const auth = require("../auth");

const { verify, verifyAdmin } = auth;

// ==============================
// CREATE ORDER
// ==============================
router.post("/", verify, orderController.createOrder);

// ==============================
// GET ALL ORDERS
// ==============================
router.get("/", verify, orderController.getAllOrders);

// ==============================
// GET SINGLE ORDER
// ==============================
router.get("/:orderId", verify, orderController.getOrder);

// ==============================
// ADD PRODUCT TO ORDER
// ==============================
router.post("/:orderId/add", verify, orderController.addToOrder);

// ==============================
// UPDATE ITEM QUANTITY
// ==============================
router.put(
  "/:orderId/item",
  verify,
  orderController.updateItemQuantity
);

// ==============================
// DELETE ORDER
// ==============================
router.delete("/:orderId", verify, verifyAdmin, orderController.removeOrder);

router.patch("/:orderId/bill", verify, orderController.markAsBilled);

router.put("/:orderId/discount", verify, orderController.applyDiscount);

// ==============================
// EXPORT ROUTER
// ==============================
module.exports = router;