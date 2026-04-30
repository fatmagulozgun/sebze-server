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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function getOrderPrintHtml(req, res, next) {
  try {
    const order = await getOrderById({
      orderId: req.params.id,
      userId: req.user.userId,
      role: req.user.role,
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items
      .map((item) => {
        const qty = Number(item.quantity || 0);
        const unit = Number(item.price || 0);
        const total = qty * unit;
        return `<tr>
          <td>${escapeHtml(item.product?.name || "-")}</td>
          <td>${qty}</td>
          <td>${unit.toFixed(2)} TL</td>
          <td>${total.toFixed(2)} TL</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sipariş Yazdır</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .meta { margin-bottom: 16px; color: #4b5563; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }
    th { background: #f3f4f6; }
    .total { margin-top: 16px; font-weight: bold; font-size: 18px; }
    .print-btn { margin-top: 16px; padding: 10px 14px; border: 0; border-radius: 8px; background: #111827; color: #fff; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Sipariş #${escapeHtml(String(order.id).slice(0, 8))}</h1>
  <div class="meta">
    Müşteri: ${escapeHtml(order.user?.name || "-")} (${escapeHtml(order.user?.email || "-")})<br />
    Tarih: ${escapeHtml(new Date(order.createdAt).toLocaleString("tr-TR"))}<br />
    Durum: ${escapeHtml(order.status || "-")}
  </div>
  <table>
    <thead>
      <tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Tutar</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Toplam: ${Number(order.totalPrice || 0).toFixed(2)} TL</div>
  <button class="print-btn" onclick="window.print()">Yazdır</button>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
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
  getOrderPrintHtml,
};
