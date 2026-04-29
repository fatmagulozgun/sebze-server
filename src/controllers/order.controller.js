const {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrderByCustomer,
  deleteOrderByCustomer,
} = require("../services/order.service");
const { sendNewOrderNotification } = require("../services/whatsapp.service");

async function getOrders(req, res, next) {
  try {
    const orders = await listOrders({
      userId: req.user.userId,
      role: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Siparişler getirildi",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await getOrderById({
      orderId: req.params.id,
      userId: req.user.userId,
      role: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Sipariş detayı getirildi",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function createNewOrder(req, res, next) {
  try {
    const order = await createOrder({
      userId: req.user.userId,
      items: req.body.items,
      note: req.body.note,
    });

    // Placeholder WhatsApp notification hook for future integrations.
    sendNewOrderNotification(order);

    res.status(201).json({
      success: true,
      message: "Sipariş oluşturuldu",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function patchOrderStatus(req, res, next) {
  try {
    const order = await updateOrderStatus({
      orderId: req.params.id,
      status: req.body.status,
    });

    res.status(200).json({
      success: true,
      message: "Sipariş durumu güncellendi",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await cancelOrderByCustomer({
      orderId: req.params.id,
      userId: req.user.userId,
      role: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Sipariş iptal edildi",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

async function removeOrder(req, res, next) {
  try {
    await deleteOrderByCustomer({
      orderId: req.params.id,
      userId: req.user.userId,
      role: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: "Sipariş silindi",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrders,
  getOrder,
  createNewOrder,
  patchOrderStatus,
  cancelOrder,
  removeOrder,
};
