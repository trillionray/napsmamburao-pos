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

    serviceDetails: {
      address: String,
      contactNumber: String,
      tableNumber: Number,
      reservationDate: Date,
      pax: Number,
      notes: String,
    },

    ordered: [
      {
        productName: String,
        quantity: Number,
        price: Number, // snapshot price
      },
    ],

    total: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending",  "billed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);