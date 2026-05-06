const Order = require("../models/Order");

// ==============================
// 1. CREATE ORDER
// ==============================
exports.createOrder = async (req, res) => {
  try {
    const { staffName, orderName, serviceType } = req.body;

    if (!staffName || !orderName || !serviceType) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const newOrder = new Order({
      staffName,
      orderName,
      serviceType,
      ordered: [],
      total: 0,
    });

    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 2. ADD PRODUCT TO ORDER
// ==============================
module.exports.addToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productName, quantity, price } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const qty = Number(quantity);
    const unitPrice = Number(price);

    if (isNaN(qty) || isNaN(unitPrice)) {
      return res.status(400).json({ message: "Invalid quantity or price" });
    }

    const existingItem = order.ordered.find(
      (item) => item.productName === productName
    );

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      order.ordered.push({
        productName,
        quantity: qty,
        price: unitPrice,
      });
    }

    // recompute total
    order.total = order.ordered.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);

    const updatedOrder = await order.save();

    return res.status(200).json(updatedOrder);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ==============================
// 3. UPDATE ORDER (FULL REPLACE)
// ==============================
module.exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ordered, serviceDetails } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (ordered) {
      order.ordered = ordered;

      order.total = order.ordered.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }, 0);
    }

    if (serviceDetails) {
      order.serviceDetails = {
        ...order.serviceDetails,
        ...serviceDetails,
      };
    }

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 4. UPDATE ITEM QUANTITY (CORE LOGIC)
// ==============================
module.exports.updateItemQuantity = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productName, quantity } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const index = order.ordered.findIndex(
      (item) => item.productName === productName
    );

    if (index === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    const newQty = Number(quantity);

    // ==============================
    // REMOVE ITEM IF QTY <= 0
    // ==============================
    if (newQty <= 0) {
      order.ordered.splice(index, 1);
    } else {
      order.ordered[index].quantity = newQty;
    }

    // ==============================
    // RECOMPUTE TOTAL FROM SCRATCH
    // ==============================
    order.total = order.ordered.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);

    const updatedOrder = await order.save();

    return res.status(200).json(updatedOrder);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ==============================
// 5. DELETE ORDER
// ==============================
module.exports.removeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Order deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 6. GET ALL ORDERS
// ==============================
module.exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 7. GET SINGLE ORDER
// ==============================
module.exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ==============================
// MARK ORDER AS BILLED
// ==============================
module.exports.markAsBilled = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // optional: prevent re-billing
    // if (order.status === "billed") {
    //   return res.status(400).json({
    //     message: "Order is already billed",
    //   });
    // }

    order.status = "billed";

    const updatedOrder = await order.save();

    return res.status(200).json(updatedOrder);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};