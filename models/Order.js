const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    staffName: {
      type: String,
      required: true,
    },

    orderName: {
      type: String,
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["dinein", "delivery", "pickup", "reservation"],
      required: true,
    },

    ordered: [
      {
        productName: String,
        quantity: Number,
        price: Number,
      },
    ],

    // ✅ RAW TOTAL BEFORE DISCOUNT
    subtotal: {
      type: Number,
      default: 0,
    },

    pax: {
      type: Number,
      default: 1,
    },

    discountedPax: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "billed", "cancelled"],
      default: "pending",
    },

    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);