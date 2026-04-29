const jwt = require("jsonwebtoken");
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  canDeleteProduct,
  deactivateProduct,
  activateProduct,
} = require("../services/product.service");

function isAdminRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role === "ADMIN";
  } catch (_error) {
    return false;
  }
}

function validateProductInput({ name, price, stock, unit, categoryId, categoryName }, isUpdate = false) {
  if (!isUpdate) {
    if (!name || price === undefined || stock === undefined || !unit || (!categoryId && !categoryName)) {
      const error = new Error("name, price, stock, unit ve kategori zorunludur");
      error.statusCode = 400;
      throw error;
    }
  }

  if (price !== undefined && Number.isNaN(Number(price))) {
    const error = new Error("price sayısal olmalıdır");
    error.statusCode = 400;
    throw error;
  }

  if (stock !== undefined && Number.isNaN(Number(stock))) {
    const error = new Error("stock sayısal olmalıdır");
    error.statusCode = 400;
    throw error;
  }
}

async function getProducts(req, res, next) {
  try {
    const { category, search } = req.query;
    const isAdmin = isAdminRequest(req);

    const products = await listProducts({
      category,
      search,
      includeOutOfStock: isAdmin,
      includeInactive: isAdmin,
    });

    res.status(200).json({
      success: true,
      message: "Ürünler getirildi",
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const isAdmin = isAdminRequest(req);
    const product = await getProductById(req.params.id, isAdmin, isAdmin);

    res.status(200).json({
      success: true,
      message: "Ürün detayı getirildi",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function addProduct(req, res, next) {
  try {
    validateProductInput(req.body);
    const product = await createProduct(req.body);

    res.status(201).json({
      success: true,
      message: "Ürün oluşturuldu",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function editProduct(req, res, next) {
  try {
    validateProductInput(req.body, true);
    const product = await updateProduct(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Ürün güncellendi",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function removeProduct(req, res, next) {
  try {
    await deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: "Ürün silindi",
    });
  } catch (error) {
    next(error);
  }
}

async function checkProductDeleteAbility(req, res, next) {
  try {
    const result = await canDeleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: "Ürün silme uygunluğu kontrol edildi",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function makeProductPassive(req, res, next) {
  try {
    const product = await deactivateProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: "Ürün pasife alındı ve müşteri tarafında gizlendi",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

async function makeProductActive(req, res, next) {
  try {
    const product = await activateProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: "Ürün tekrar aktife alındı ve müşteri tarafında görünür oldu",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProduct,
  addProduct,
  editProduct,
  removeProduct,
  checkProductDeleteAbility,
  makeProductPassive,
  makeProductActive,
};
