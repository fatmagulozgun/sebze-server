const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function mapCartItem(row) {
  return {
    id: row.product.id,
    name: row.product.name,
    description: row.product.description || null,
    imageUrl: row.product.imageUrl || null,
    price: row.product.price,
    stock: row.product.stock,
    unit: row.product.unit,
    category: row.product.category
      ? {
          id: row.product.category.id,
          name: row.product.category.name,
        }
      : null,
    quantity: row.quantity,
  };
}

async function listCartItems(userId) {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows
    .filter((row) => row.product && row.product.isActive !== false && row.product.stock > 0)
    .map(mapCartItem);
}

async function addOrIncrementCartItem({ userId, productId, quantity = 1 }) {
  const qty = Number(quantity);
  if (!productId || Number.isNaN(qty) || qty <= 0) {
    const error = new Error("Gecerli productId ve quantity zorunludur");
    error.statusCode = 400;
    throw error;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      stock: true,
      isActive: true,
    },
  });

  if (!product || product.isActive === false) {
    const error = new Error("Urun bulunamadi");
    error.statusCode = 404;
    throw error;
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    select: {
      quantity: true,
    },
  });

  const nextQuantity = Math.min((existing?.quantity || 0) + qty, Math.max(product.stock, 1));

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: {
      userId,
      productId,
      quantity: nextQuantity,
    },
    update: {
      quantity: nextQuantity,
    },
  });

  return listCartItems(userId);
}

async function setCartItemQuantity({ userId, productId, quantity }) {
  const qty = Number(quantity);
  if (!productId || Number.isNaN(qty) || qty < 0) {
    const error = new Error("Gecerli productId ve quantity zorunludur");
    error.statusCode = 400;
    throw error;
  }

  if (qty === 0) {
    await prisma.cartItem.deleteMany({
      where: {
        userId,
        productId,
      },
    });
    return listCartItems(userId);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, isActive: true },
  });

  if (!product || product.isActive === false) {
    const error = new Error("Urun bulunamadi");
    error.statusCode = 404;
    throw error;
  }

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: {
      userId,
      productId,
      quantity: Math.min(qty, Math.max(product.stock, 1)),
    },
    update: {
      quantity: Math.min(qty, Math.max(product.stock, 1)),
    },
  });

  return listCartItems(userId);
}

async function removeCartItem({ userId, productId }) {
  await prisma.cartItem.deleteMany({
    where: {
      userId,
      productId,
    },
  });
  return listCartItems(userId);
}

async function clearCart(userId) {
  await prisma.cartItem.deleteMany({
    where: { userId },
  });
  return [];
}

module.exports = {
  listCartItems,
  addOrIncrementCartItem,
  setCartItemQuantity,
  removeCartItem,
  clearCart,
};
