const session = require('express-session');
const Category = require('../../models/category.model.js');
const Article = require('../../models/article.model.js');
const User = require('../../models/user.model.js');
const moment = require('moment');
/**
 * GET /
 * Home page.
 */
exports.getIndex = (req, res) => {
  res.render('frontend/index.ejs', { title: 'Index' });
}

exports.getHome = async (req, res, next) => {
  //get all category name
  const Articles = await Article.find().populate('author', 'profile.name').populate('caterogyID', 'categoryName').sort({ "createdAt": -1 }).limit(100);
  const favoritesTopFive = await Article.find().populate('author', 'profile.name').populate('caterogyID', 'categoryName').sort({ "favoritesCount": -1 }).limit(5);
  const categories = await Category.find({ status: true }).sort({ Order: 'ascending' });
  req.session.categories = categories;
  let categoriesID = [];

  categories.forEach(function (category) {
    categoriesID.push(category._id);
  });

  const articleByGroup = await Article.find({ caterogyID: categoriesID }).populate('author', 'profile.name').populate('caterogyID', 'categoryName').sort({ "favoritesCount": -1 }).limit(5);//.exec((err, article) => {
  //articleByGroup.push(article);
  res.render('frontend/home.ejs', { title: 'Medium home page', categories: categories, moment: moment, favoritesTopFive: favoritesTopFive, Articles: Articles, articleByGroup: articleByGroup });
}

