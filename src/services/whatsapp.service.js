function sendNewOrderNotification(order) {
  const orderId = order && order.id ? order.id : "bilinmiyor";
  console.log(`Yeni sipariş geldi (orderId: ${orderId})`);
}

module.exports = {
  sendNewOrderNotification,
};
