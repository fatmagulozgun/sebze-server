const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeUnit(unit) {
  const raw = String(unit || "").trim();
  const normalized = raw.toLowerCase();
  if (normalized === "kg") return { unit: "KG", customUnit: null };
  if (normalized === "gr" || normalized === "gram" || normalized === "gramaj") {
    return { unit: "GR", customUnit: null };
  }
  if (normalized === "adet" || normalized === "piece") return { unit: "ADET", customUnit: null };
  if (normalized === "paket" || normalized === "packet") return { unit: "PAKET", customUnit: null };
  if (normalized === "ml") return { unit: "ML", customUnit: null };
  if (normalized === "lt" || normalized === "l" || normalized === "liter") return { unit: "LT", customUnit: null };
  if (normalized === "gram") return { unit: "GRAM", customUnit: null };
  if (normalized === "piece") return { unit: "PIECE", customUnit: null };
  return { unit: "OTHER", customUnit: raw || null };
}

function normalizeUnitName(unit) {
  const raw = String(unit || "").trim();
  const normalized = raw.toLowerCase();
  if (normalized === "kg") return "kg";
  if (normalized === "gr" || normalized === "gram" || normalized === "gramaj") return "gr";
  if (normalized === "adet" || normalized === "piece") return "adet";
  if (normalized === "paket" || normalized === "packet") return "paket";
  if (normalized === "ml") return "ml";
  if (normalized === "lt" || normalized === "l" || normalized === "liter") return "lt";
  return raw.toLowerCase();
}

async function ensureUnitExists(unitName) {
  const value = String(unitName || "").trim().toLowerCase();
  if (!value) return;
  await prisma.unit.upsert({
    where: { name: value },
    update: {},
    create: { name: value },
  });
}

function normalizeProductName(name) {
  if (!name) return name;
  return String(name)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}

async function listProducts({ category, search, includeOutOfStock = false, includeInactive = false }) {
  const where = {};

  if (!includeOutOfStock) {
    where.stock = { gt: 0 };
  }

  if (!includeInactive) {
    where.isActive = true;
  }

  if (category) {
    where.OR = [
      { categoryId: category },
      { category: { name: { equals: category, mode: "insensitive" } } },
    ];
  }

  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.product.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getProductById(id, includeOutOfStock = false, includeInactive = false) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!product || (!includeOutOfStock && product.stock <= 0) || (!includeInactive && product.isActive === false)) {
    const error = new Error("Ürün bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  return product;
}

async function resolveCategoryId({ categoryId, categoryName }) {
  if (categoryId) return categoryId;
  const normalizedCategoryName = String(categoryName || "").trim();
  if (!normalizedCategoryName) {
    const error = new Error("Kategori zorunludur");
    error.statusCode = 400;
    throw error;
  }
  const existing = await prisma.category.findFirst({
    where: { name: { equals: normalizedCategoryName, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name: normalizedCategoryName },
    select: { id: true },
  });
  return created.id;
}

async function createProduct({ name, description, imageUrl, price, stock, unit, categoryId, categoryName }) {
  const normalizedName = normalizeProductName(name);
  const resolvedCategoryId = await resolveCategoryId({ categoryId, categoryName });
  const normalizedUnitName = normalizeUnitName(unit);

  if (normalizedName) {
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      const error = new Error("Zaten böyle bir ürün var");
      error.statusCode = 409;
      throw error;
    }
  }

  await ensureUnitExists(normalizedUnitName);

  return prisma.product.create({
    data: {
      name: normalizedName,
      description,
      imageUrl,
      isActive: true,
      price: Number(price),
      stock: Number(stock),
      ...normalizeUnit(unit),
      categoryId: resolvedCategoryId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

async function updateProduct(id, payload) {
  const data = {};
  let unitNameToEnsure = null;

  if (payload.name !== undefined) data.name = normalizeProductName(payload.name);
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);
  if (payload.price !== undefined) data.price = Number(payload.price);
  if (payload.stock !== undefined) data.stock = Number(payload.stock);
  if (payload.unit !== undefined) {
    Object.assign(data, normalizeUnit(payload.unit));
    unitNameToEnsure = normalizeUnitName(payload.unit);
  }
  if (payload.categoryId !== undefined || payload.categoryName !== undefined) {
    data.categoryId = await resolveCategoryId({
      categoryId: payload.categoryId,
      categoryName: payload.categoryName,
    });
  }

  try {
    if (unitNameToEnsure) {
      await ensureUnitExists(unitNameToEnsure);
    }
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Ürün bulunamadı");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  }
}

async function deleteProduct(id) {
  const existingOrderItem = await prisma.orderItem.findFirst({
    where: { productId: id },
    select: { id: true },
  });

  if (existingOrderItem) {
    const error = new Error("Bu ürün sipariş geçmişinde bulunduğu için silinemez");
    error.statusCode = 409;
    throw error;
  }

  try {
    await prisma.product.delete({
      where: { id },
    });
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Ürün bulunamadı");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    if (error.code === "P2003") {
      const relationError = new Error("Bu ürün bağlı kayıtlar olduğu için silinemez");
      relationError.statusCode = 409;
      throw relationError;
    }
    throw error;
  }
}

async function canDeleteProduct(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

  if (!product) {
    const error = new Error("Ürün bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  const existingOrderItem = await prisma.orderItem.findFirst({
    where: { productId: id },
    select: { id: true },
  });

  return {
    canDelete: !existingOrderItem,
    reason: existingOrderItem ? "HAS_ORDER_HISTORY" : null,
    product,
  };
}

async function deactivateProduct(id) {
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: { isActive: false },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.cartItem.deleteMany({
        where: { productId: id },
      });

      return product;
    });
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Ürün bulunamadı");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  }
}

async function activateProduct(id) {
  try {
    return await prisma.product.update({
      where: { id },
      data: { isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (error.code === "P2025") {
      const notFoundError = new Error("Ürün bulunamadı");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  canDeleteProduct,
  deactivateProduct,
  activateProduct,
};
