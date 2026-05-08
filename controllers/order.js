const Order = require("../models/Order");


const computeBill = (order) => {
  const subtotal = order.ordered.reduce((sum, item) => {
    return sum + (item.price || 0) * (item.quantity || 0);
  }, 0);

  const pax = order.pax || 1;
  const discountedPax = order.discountedPax || 0;
  const discountRate = order.discount || 0; // percent

  const perHead = subtotal / pax;
  const discountBase = perHead * discountedPax;
  const discountAmount = discountBase * (discountRate / 100);

  const grandTotal = subtotal - discountAmount;

  return {
    subtotal,
    discount: discountAmount,
    grandTotal,
  };
};


// ==============================
// 1. CREATE ORDER
// ==============================
module.exports.createOrder = async (req, res) => {
  try {
    const { staffName, orderName, serviceType, pax } = req.body;

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
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      pax
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
    const bill = computeBill(order);

    order.subtotal = bill.subtotal;
    order.discount = bill.discount;
    order.grandTotal = bill.grandTotal;

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
    const { ordered, serviceDetails, pax, discountedPax, discount } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (ordered) order.ordered = ordered;
    if (serviceDetails) {
      order.serviceDetails = {
        ...order.serviceDetails,
        ...serviceDetails,
      };
    }

    if (pax !== undefined) order.pax = pax;
    if (discountedPax !== undefined) order.discountedPax = discountedPax;
    if (discount !== undefined) order.discount = discount;

    const bill = computeBill(order);

    order.subtotal = bill.subtotal;
    order.discount = bill.discount;
    order.grandTotal = bill.grandTotal;

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
    const bill = computeBill(order);

    order.subtotal = bill.subtotal;
    order.discount = bill.discount;
    order.grandTotal = bill.grandTotal;

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

module.exports.applyDiscount = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pax, discountedPax, discount } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ==============================
    // SAFE INPUTS
    // ==============================
    order.pax = Math.max(Number(pax) || 1, 1);
    order.discountedPax = Math.max(Number(discountedPax) || 0, 0);
    order.discount = Math.max(Number(discount) || 0, 0);

    // ==============================
    // COMPUTE SUBTOTAL
    // ==============================
    const subtotal = order.ordered.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }, 0);

    // ==============================
    // PER-HEAD COMPUTATION
    // ==============================
    const perHead = subtotal / order.pax;

    const discountBase = perHead * order.discountedPax;
    const discountAmount = discountBase * (order.discount / 100);

    // ==============================
    // FINAL BILL
    // ==============================
    order.subtotal = subtotal;
    order.grandTotal = subtotal - discountAmount;

    const updated = await order.save();

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};