const validator = require('validator');
var session = require('express-session');
const moment = require("moment");
const Category = require('../../models/category.model.js');

/**
 * GET/  Add Category
 * getAddCategory
 */
exports.getAddCategory = (req, res) => {
  res.render('backend/addcategory.ejs');
}
/**
 * POST/  Add Category
 * postAddCategory
 */
exports.postAddCategory = (req, res, next) => {
  //check data input
  const validationErrors = [];
  if (validator.isEmpty(req.body.categoryName)) validationErrors.push({ msg: 'Please enter category name.' });
  if (validator.isEmpty(req.body.Order)) validationErrors.push({ msg: 'Please enter Order.' });
  //show error
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/admin/addcategory')
  }
  //set value for Schema
  const category = new Category({
    categoryName: req.body.categoryName,
    Order: parseInt(req.body.Order)
  });

  //check in db has category name
  Category.findOne({ categoryName: req.body.categoryName }, (err, existingCategory) => {
    if (err) { return next(err); }
    if (existingCategory) {
      req.flash('errors', { msg: 'category name already exists.' });
      return res.redirect('/admin/addcategory');
    }
    //save to db
    category.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Add new catogory successfylly.' });
      res.redirect('/admin/addcategory');
    });
  });
}

/**
 * GET/  List Category
 * getAddCategory
 */
exports.getListCategory = (req, res, next) => {
  Category.find().sort({ Order: 'ascending' }).exec(function (err, categories) {
    if (err) { return next(err); }

    res.render('backend/listcategory.ejs', { categories: categories });
  });
}

/**
 * GET/  edit Category
 * getEditCategory
 */
exports.getEditCategory = (req, res, next) => {
  Category.findById(req.params.id, function (err, category) {
    if (err) return next(err);
    res.render('backend/editcategory.ejs', {
      category: category,
      current: req.params.id
    })
  });
}

/**
 * GET/  edit Category
 * getEditCategory
 */
exports.postEditCategory = (req, res, next) => {
  //check data input
  const validationErrors = [];
  if (validator.isEmpty(req.body.categoryName)) validationErrors.push({ msg: 'Please enter category name.' });
  if (validator.isEmpty(req.body.Order)) validationErrors.push({ msg: 'Please enter Order.' });
  //show error
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/admin/addcategory')
  }
  //find category by ID and save value
  Category.findById(req.params.id, function (err, category) {
    if (err) return next(err);
    //set values
    category.categoryName = req.body.categoryName;
    category.Order = req.body.Order;
    category.save(function (err, category, count) {
      if (err) return next(err);
      return res.redirect('/admin/listcategory')
    });
  });
}

/**
 * GET/  delete Category
 * getDeleteCategory
 */
exports.getDeleteCategory = (req, res, next) => {
  //find category by ID and save value
  Category.findById(req.params.id, function (err, category) {
    if (err) return next(err);

    category.status = false;
    category.endDate = Date();
    category.save(function (err, category, count) {
      if (err) return next(err);
      return res.redirect('/admin/listcategory')
    });
  });
}

/**
 * GET/  Update status Category
 * getUpdateCategory
 */
exports.getUpdatecategory = (req, res, next) => {
  //find category by ID and save value
  Category.findById(req.params.id, function (err, category) {
    if (err) return next(err);

    category.status = true;
    category.endDate = null;
    category.save(function (err, category, count) {
      if (err) return next(err);
      return res.redirect('/admin/listcategory')
    });
  });
}
