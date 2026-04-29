const {
  getCustomers,
  getCategories,
  getUnits,
  deleteCategory,
  deleteUnit,
  getDashboardSummary,
  getNotifications,
  getUnreadNotificationCount,
} = require("../services/admin.service");

async function getDashboard(req, res, next) {
  try {
    const summary = await getDashboardSummary();

    res.status(200).json({
      success: true,
      message: "Dashboard verileri getirildi",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

async function getCustomersList(req, res, next) {
  try {
    const customers = await getCustomers({
      search: req.query.search,
    });

    res.status(200).json({
      success: true,
      message: "Müşteri listesi getirildi",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
}

async function getCategoriesList(req, res, next) {
  try {
    const categories = await getCategories();
    res.status(200).json({
      success: true,
      message: "Kategori listesi getirildi",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCategoryItem(req, res, next) {
  try {
    const deleted = await deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: "Kategori silindi",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
}

async function getUnitsList(req, res, next) {
  try {
    const units = await getUnits();
    res.status(200).json({
      success: true,
      message: "Birim listesi getirildi",
      data: units,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUnitItem(req, res, next) {
  try {
    const deleted = await deleteUnit(req.params.id);
    res.status(200).json({
      success: true,
      message: "Birim silindi",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
}

async function getNotificationsList(req, res, next) {
  try {
    const notifications = await getNotifications();
    res.status(200).json({
      success: true,
      message: "Bildirimler getirildi",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadNotifications(req, res, next) {
  try {
    const unread = await getUnreadNotificationCount();
    res.status(200).json({
      success: true,
      message: "Okunmamis bildirim sayisi getirildi",
      data: { unread },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getCustomersList,
  getCategoriesList,
  getUnitsList,
  deleteCategoryItem,
  deleteUnitItem,
  getNotificationsList,
  getUnreadNotifications,
};
