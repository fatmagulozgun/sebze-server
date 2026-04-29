const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALLOWED_ORDER_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];

async function createOrder({ userId, items, note }) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Sipariş kalemleri zorunludur");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    let totalPrice = 0;
    const preparedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.productId || Number.isNaN(quantity) || quantity <= 0) {
        const error = new Error("Her kalem için geçerli productId ve quantity zorunludur");
        error.statusCode = 400;
        throw error;
      }

      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        const error = new Error(`Ürün bulunamadı: ${item.productId}`);
        error.statusCode = 404;
        throw error;
      }

      if (product.isActive === false) {
        const error = new Error(`Satıştan kaldırılmış ürün: ${product.name}`);
        error.statusCode = 400;
        throw error;
      }

      if (product.stock < quantity) {
        const error = new Error(`Yetersiz stok: ${product.name}`);
        error.statusCode = 400;
        throw error;
      }

      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: quantity },
        },
        data: {
          stock: { decrement: quantity },
        },
      });

      if (updated.count === 0) {
        const error = new Error(`Stok güncellenemedi: ${product.name}`);
        error.statusCode = 400;
        throw error;
      }

      preparedItems.push({
        productId: product.id,
        quantity,
        price: product.price,
      });
      totalPrice += product.price * quantity;
    }

    const order = await tx.order.create({
      data: {
        userId,
        status: "PENDING",
        totalPrice,
        note: note ? String(note).trim() : null,
        items: {
          create: preparedItems,
        },
      },
      include: getOrderInclude(),
    });

    return order;
  });
}

function getOrderInclude() {
  return {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            unit: true,
          },
        },
      },
    },
  };
}

async function listOrders({ userId, role }) {
  const where = role === "ADMIN" ? {} : { userId };

  return prisma.order.findMany({
    where,
    include: getOrderInclude(),
    orderBy: { createdAt: "desc" },
  });
}

async function getOrderById({ orderId, userId, role }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: getOrderInclude(),
  });

  if (!order) {
    const error = new Error("Sipariş bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  if (role !== "ADMIN" && order.userId !== userId) {
    const error = new Error("Bu siparişi görüntüleme yetkiniz yok");
    error.statusCode = 403;
    throw error;
  }

  return order;
}

async function updateOrderStatus({ orderId, status }) {
  const normalized = String(status || "").trim().toUpperCase();
  if (!ALLOWED_ORDER_STATUSES.includes(normalized)) {
    const error = new Error("Geçersiz sipariş durumu");
    error.statusCode = 400;
    throw error;
  }

  try {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status: normalized },
      include: getOrderInclude(),
    });
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Sipariş bulunamadı");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  }
}

async function cancelOrderByCustomer({ orderId, userId, role }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    const error = new Error("Sipariş bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  if (role !== "ADMIN" && order.userId !== userId) {
    const error = new Error("Bu siparişi iptal etme yetkiniz yok");
    error.statusCode = 403;
    throw error;
  }

  if (order.status === "DELIVERED") {
    const error = new Error("Teslim edilen sipariş iptal edilemez");
    error.statusCode = 400;
    throw error;
  }

  if (order.status === "CANCELLED") {
    return getOrderById({ orderId, userId, role });
  }

  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: getOrderInclude(),
    });
  });
}

async function deleteOrderByCustomer({ orderId, userId, role }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true },
  });

  if (!order) {
    const error = new Error("Sipariş bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  if (role !== "ADMIN" && order.userId !== userId) {
    const error = new Error("Bu siparişi silme yetkiniz yok");
    error.statusCode = 403;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: { orderId },
    });

    await tx.order.delete({
      where: { id: orderId },
    });
  });
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrderByCustomer,
  deleteOrderByCustomer,
  ALLOWED_ORDER_STATUSES,
};
