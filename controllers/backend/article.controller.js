const session = require('express-session');
const moment = require('moment');
const mongoose = require('mongoose');
//const Category = require('../../models/category.model.js');
const Article = require('../../models/article.model.js');
const Bookmark = require('../../models/bookmark.model.js');
const User = require('../../models/user.model.js');
const Comment = require('../../models/comment.model.js');


/***
 * GET/ postListArticle
 * All ARTICLE
 * step 1:find user read has bookmark
*/
exports.getListArticle = async (req, res, next) => {

  const resPerPage = 10; // results per page
  const page = req.params.page || 1; // Page 
  //find all article 
  const articles = await Article.find().populate('author', 'profile.name').populate('caterogyID', 'categoryName').sort({ "createdAt": -1 })
    .skip((resPerPage * page) - resPerPage)
    .limit(resPerPage);
  const numOfArticle = await Article.countDocuments();
  //show html page
  res.render('backend/listarticle.ejs', {
    title: 'List Article',
    articles: articles,
    moment: moment,
    currentPage: page,
    pages: Math.ceil(numOfArticle / resPerPage),
    numOfResults: numOfArticle
  })
}

// GET - Shop Product Page | - Displaying demanded product page with page numbers
exports.getshop = async (req, res, next) => {
  // Declaring variable
  const resPerPage = 9; // results per page
  const page = req.params.page || 1; // Page

  if (req.query.search) {
    // Declaring query based/search variables
    const searchQuery = req.query.search,
      regex = new RegExp(escapeRegex(req.query.search), 'gi');
    // Find Demanded Products - Skipping page values, limit results       per page
    const foundProducts = await Product.find({ name: regex })
      .skip((resPerPage * page) - resPerPage)
      .limit(resPerPage);
    // Count how many products were found
    const numOfProducts = await Product.count({ name: regex });
    // Renders The Page
    res.render('shop-products.ejs', {
      products: foundProducts,
      currentPage: page,
      pages: Math.ceil(numOfProducts / resPerPage),
      searchVal: searchQuery,
      numOfResults: numOfProducts
    });
  }
};
/**
 * GET/  delete Article
 * getDeleteArticle
 */
exports.getDeleteArticle = (req, res, next) => {
  //find category by ID and save value
  Article.findByIdAndDelete(req.params.id, function (err) {
    if (err) return next(err);
    Comment.deleteMany({ article: req.params.id }, function (err) {
      return res.redirect('/admin/listarticle/1')
    });
  });
}

/**
 * GET/  comment list
 * getCommentList
 */
exports.getCommentList = async (req, res, next) => {
  const resPerPage = 10; // results per page
  const page = req.params.page || 1; // Page 
  //find all article 
  const comments = await Comment.find().populate('article', 'title').populate('author', 'email').sort({ "article": -1 })
    .skip((resPerPage * page) - resPerPage)
    .limit(resPerPage);
  const numOfComment = await Comment.countDocuments();

  //show html page
  res.render('backend/comment.ejs', {
    title: 'List comment',
    comments: comments,
    moment: moment,
    currentPage: page,
    pages: Math.ceil(numOfComment / resPerPage),
    numOfResults: numOfComment
  })
}

/**
 * GET/  delete comment
 * getDeleteComment
 */
exports.getDeleteComment = (req, res, next) => {
  //find category by ID and save value
  Comment.findByIdAndDelete(req.params.id, function (err) {
    if (err) return next(err);
    return res.redirect('/admin/commentlist/1')
  });
}
