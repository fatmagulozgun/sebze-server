const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getDashboardSummary() {
  const [totalProducts, pendingOrders, totalCustomers, lowStockProducts] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),
      prisma.product.findMany({
        where: {
          stock: {
            gt: 0,
            lte: 10,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          stock: "asc",
        },
        take: 10,
      }),
    ]);

  return {
    totalProducts,
    pendingOrders,
    totalCustomers,
    lowStockProducts,
  };
}

async function getCustomers({ search }) {
  const keyword = (search || "").trim();
  const whereWithPhone = {
    role: "CUSTOMER",
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
            { phone: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const whereWithoutPhone = {
    role: "CUSTOMER",
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const selectWithPhone = {
    id: true,
    name: true,
    email: true,
    phone: true,
    createdAt: true,
    orders: {
      select: {
        id: true,
        totalPrice: true,
      },
    },
  };
  const selectWithoutPhone = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    orders: {
      select: {
        id: true,
        totalPrice: true,
      },
    },
  };

  let users = [];
  try {
    users = await prisma.user.findMany({
      where: whereWithPhone,
      select: selectWithPhone,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    // If DB migration for `phone` is missing, gracefully fallback
    users = await prisma.user.findMany({
      where: whereWithoutPhone,
      select: selectWithoutPhone,
      orderBy: { createdAt: "desc" },
    });
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    createdAt: u.createdAt,
    totalOrders: u.orders.length,
    totalSpent: u.orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
  }));
}

async function getCategories() {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function deleteCategory(categoryId) {
  const id = String(categoryId || "").trim();
  if (!id) {
    const error = new Error("Kategori bulunamadı");
    error.statusCode = 400;
    throw error;
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!category) {
    const error = new Error("Kategori bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    const error = new Error("Bu kategoriye bagli urunler var. Once urunleri duzenleyin.");
    error.statusCode = 409;
    throw error;
  }

  await prisma.category.delete({
    where: { id },
  });

  return category;
}

async function getUnits() {
  return prisma.unit.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

function getUnitUsageWhere(unitName) {
  const normalized = String(unitName || "").trim().toLowerCase();
  const or = [{ customUnit: { equals: normalized, mode: "insensitive" } }];

  if (normalized === "kg") or.push({ unit: "KG" });
  if (normalized === "gr") or.push({ unit: { in: ["GR", "GRAM"] } });
  if (normalized === "adet") or.push({ unit: { in: ["ADET", "PIECE"] } });
  if (normalized === "paket") or.push({ unit: "PAKET" });
  if (normalized === "ml") or.push({ unit: "ML" });
  if (normalized === "lt") or.push({ unit: "LT" });

  return { OR: or };
}

async function deleteUnit(unitId) {
  const id = String(unitId || "").trim();
  if (!id) {
    const error = new Error("Birim bulunamadı");
    error.statusCode = 400;
    throw error;
  }

  const unit = await prisma.unit.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!unit) {
    const error = new Error("Birim bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  const productCount = await prisma.product.count({
    where: getUnitUsageWhere(unit.name),
  });

  if (productCount > 0) {
    const error = new Error("Bu birime bagli urunler var. Once urunleri duzenleyin.");
    error.statusCode = 409;
    throw error;
  }

  await prisma.unit.delete({
    where: { id },
  });

  return unit;
}

async function getNotifications() {
  const [pendingOrders, lowStockProducts, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { stock: { gte: 0, lte: 5 } },
      select: { id: true, name: true, stock: true, unit: true, createdAt: true },
      orderBy: { stock: "asc" },
      take: 8,
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const notifications = [
    ...pendingOrders.map((o) => ({
      id: `order-${o.id}`,
      type: "ORDER",
      title: "Yeni sipariş geldi",
      subtitle: `${o.user?.name || "Müşteri"} - ${Number(o.totalPrice || 0).toFixed(2)} TL`,
      createdAt: o.createdAt,
      targetRoute: `/admin/siparisler#${o.id}`,
    })),
    ...lowStockProducts.map((p) => ({
      id: `stock-${p.id}`,
      type: "STOCK",
      severity: p.stock === 0 ? "CRITICAL" : "WARNING",
      title: "Stok uyarısı",
      subtitle: `${p.name} stogu ${p.stock} ${p.unit}`,
      createdAt: p.createdAt,
      targetRoute: `/admin/urunler#${p.id}`,
    })),
    ...newCustomers.map((u) => ({
      id: `customer-${u.id}`,
      type: "CUSTOMER",
      title: "Yeni müşteri kaydoldu",
      subtitle: u.name,
      createdAt: u.createdAt,
      targetRoute: `/admin/musteriler#${u.id}`,
    })),
  ];

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications.slice(0, 20);
}

async function getUnreadNotificationCount() {
  const list = await getNotifications();
  return list.length;
}

module.exports = {
  getDashboardSummary,
  getCustomers,
  getCategories,
  getUnits,
  deleteCategory,
  deleteUnit,
  getNotifications,
  getUnreadNotificationCount,
};
