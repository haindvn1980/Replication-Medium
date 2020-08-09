const validator = require('validator');
const session = require('express-session');
const slug = require('slug');
const moment = require('moment');
const mongoose = require('mongoose');
const util = require('../../utils/utils');
//const Category = require('../../models/category.model.js');
const Article = require('../../models/article.model.js');
const Bookmark = require('../../models/bookmark.model.js');
const User = require('../../models/user.model.js');
const Comment = require('../../models/comment.model.js');


/*** 
 * GET/ postNewArticle
 * ADD NEWS ARTICLE
*/
exports.getNewArticle = (req, res, next) => {
  res.render('frontend/articles/newarticle.ejs', { title: 'Add News Article' });
}

/*** 
 * POST/ postNewArticle
 * ADD NEWS ARTICLE
 * STEP 1:find id of user 
 * step 2:check data input
 * step 3:create obj of Article DB
 * step 4: save to db
*/
exports.postNewArticle = (req, res, next) => {
  const validationErrors = [];
  if (validator.isEmpty(req.body.title)) validationErrors.push({ msg: 'Please enter a title.' })
  if (validator.isEmpty(req.body.description)) validationErrors.push({ msg: 'Please enter a description.' })
  if (validator.isEmpty(req.body.bodyArticle)) validationErrors.push({ msg: 'Please enter a body Article.' })
  // Check Image Upload
  if (!req.file) {
    validationErrors.push({ msg: 'Please select images.' });
  }
  //if input data has error. show HMTL page
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/newarticle')
  }

  let splitStr = req.body.bodyArticle.split(' ');
  let minRead = Math.ceil(splitStr.length / 300);
  let tagList = null;
  if (typeof req.body.tagList !== 'undefined') {
    tagList = req.body.tagList.split(';');
  }

  //setup obj Article
  const article = new Article({
    slug: slug(req.body.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36),
    title: req.body.title,
    description: req.body.description,
    bodyArticle: req.body.bodyArticle,
    mainImage: req.file.filename,
    caterogyID: req.body.category,
    author: req.user.id,
    minRead: minRead,
    tagList: tagList
  });
  article.save((err) => {
    if (err) { return next(err); }
    req.flash('success', { msg: 'Article Added.' })
    res.redirect('/newarticle')
  });
}

/***
 * GET/ postArticle
 * VIEW ARTICLE
 * step 1:find user read has bookmark
*/
exports.getArticle = async (req, res, next) => {
  let flagbookmark = false;
  //check current user has bookmark this article
  await Bookmark.findOne({ articleID: req.params.id, userID: req.user.id }).exec((err, articleBookmark) => {
    if (err) { return next(err); }
    if (articleBookmark) {
      flagbookmark = true;
    }
  });
  //find article by id
  Article.findById(req.params.id).populate('author', ['profile.name', 'profile.picture']).populate('caterogyID', 'categoryName').exec((err, article) => {
    if (err) { return next(err); }

    //get all comment of article
    Comment.find({ article: req.params.id }).populate('author', ['profile.name', 'profile.picture'])
      .exec((err, comments) => {
        if (err) { return next(err); }
        //get next of article
        Article.find({ caterogyID: article.caterogyID._id, createdAt: { $gt: article.createdAt } })
          .populate('author', 'profile.name').populate('caterogyID', 'categoryName')
          .sort({ "createdAt": -1 }).limit(5)
          .exec((err, articleNext) => {
            if (err) { return next(err); }
            let flagFollowing = false;
            let flagCurrentUser = false;
            //check user following WRITTEN
            let indexUser = req.user.following.indexOf(article.author._id);
            if (indexUser >= 0) {
              flagFollowing = true;
            }
            if (article.author._id.equals(req.user._id)) {
              flagCurrentUser = true;
            }
            res.render('frontend/articles/article.ejs', { title: 'Article Detail', article: article, moment: moment, articleNext: articleNext, flagbookmark: flagbookmark, flagFollowing: flagFollowing, comments: comments, flagCurrentUser: flagCurrentUser })
          });
      });
  });
}

/******
 * GET / getCategory
 * VIEW ALL CATEGORY
 */
exports.getCategory = (req, res, next) => {
  Article.find({ caterogyID: req.params.id })
    .populate('author', 'profile.name')
    .populate('caterogyID', 'categoryName')
    .sort({ "createdAt": -1 })
    .exec((err, articles) => {
      if (err) { return next(err); }
      Article.find({ caterogyID: req.params.id }).populate('author', 'profile.name').populate('caterogyID', 'categoryName').sort({ "favoritesCount": -1 }).limit(6).exec((err, favoritesTopFive) => {
        if (err) { return next(err) }
        res.render('frontend/articles/category.ejs', { title: 'Article Detail', articles: articles, moment: moment, favoritesTopFive: favoritesTopFive })
      })
    });
}

/******
 * GET / getFavorite
 * add favorite for article
 */
exports.getFavorite = (req, res, next) => {
  Article.findById(req.params.id).exec((err, article) => {
    if (err) { return next(err); }
    article.favoritesCount++;
    article.save((err) => {
      if (err) { return next(err); }
      res.redirect('/article/' + req.params.id);
    })
  })
}

/******
 * GET / getbookmark
 * add bookmark for User
 */
exports.getBookmark = (req, res, next) => {

  //get ID of author
  Article.findById(req.params.id).exec((err, article) => {
    if (err) { return next(err); }
    if (article.author !== req.user.id) {
      Bookmark.findOne({ articleID: req.params.id, userID: req.user.id }).exec((err, articleBookmark) => {
        if (err) { return next(err); }
        if (!articleBookmark) {
          const bookmark = new Bookmark({
            articleID: req.params.id,
            userID: req.user.id
          })
          bookmark.save((err) => {
            if (err) { return next(err); }
          })
        }
      });
    }
    res.redirect('/article/' + req.params.id);
  });
}

/******
 * GET / getfollow
 * add bookmark for User
 */
exports.getRemoveBookmark = (req, res, next) => {
  Bookmark.findOne({ articleID: req.params.id, userID: req.user.id }).remove().exec((err) => {
    if (err) { return next(err); }
    res.redirect('/article/' + req.params.id);
  });
}

/******
 * GET / getfollow
 * add bookmark for User
 */
exports.getFollow = (req, res, next) => {
  //get ID of author
  Article.findById(req.params.id).exec((err, article) => {
    if (err) { return next(err); }
    if (!article.author._id.equals(req.session.user._id)) {
      User.findById(req.session.user._id).exec((err, user) => {
        if (err) { return next(err); }
        let author = article.author;
        let indexUser = user.following.indexOf(author);
        if (indexUser == -1) {
          user.following.push(article.author);
          user.save((err) => {
            if (err) { return next(err); }
          })
        }
      });
    }
    res.redirect('/article/' + req.params.id);
  });
}

/******
 * GET / getunfollow
 * add bookmark for User
 */
exports.getUnFollow = (req, res, next) => {
  //get ID of user unfollow
  User.updateOne({ _id: req.session.user._id }, {
    $pull: { following: req.params.id }
  }).exec((err, article) => {
    if (err) { return next(err); }
    res.redirect('/queue');
  });
}

/******
 * GET / postcomment
 * show all comment of article
 */
exports.postComment = (req, res, next) => {

  if (req.body.comment == undefined || req.body.comment == '') {
    res.redirect('/article/' + req.params.id);
  }
  const comment = new Comment({
    article: req.params.id,
    author: req.user.id,
    body: req.body.comment
  })
  comment.save((err) => {
    if (err) { return next(err); }
    res.redirect('/article/' + req.params.id);
  })
}

/**
 * Get/getQueue
 * show all save bookmark
 */
exports.getQueue = (req, res, next) => {
  Bookmark.find({ userID: req.user.id }).populate('articleID', ['title', 'description', 'createdAt', 'mainImage', 'minRead']).limit(20).exec((err, articles) => {
    if (err) { return next(err); }
    User.find({ _id: req.user.following }).exec((err, users) => {
      if (err) { return next(err); }
      res.render('frontend/articles/queue.ejs', { title: 'Article Queue', moment: moment, articles: articles, users: users })
    });
  });
}

/**
 * get/getSearch
 * search title of arcticle
 */
exports.getSearch = async (req, res, next) => {
  const searchQuery = req.query.search;

  if (searchQuery) {
    const regex = new RegExp(util.escapeRegex(searchQuery), 'gi');
    const resPerPage = 5; // results per page
    const page = req.params.page || 1; // Page 
    //find all article 
    const articles = await Article.find({ title: regex }).populate('author', ['profile.name', 'profile.picture']).populate('caterogyID', 'categoryName').sort({ "createdAt": -1 })
      .skip((resPerPage * page) - resPerPage)
      .limit(resPerPage);
    const numOfProducts = await Article.countDocuments({ title: regex });
    console.log(articles);
    //show html page
    res.render('frontend/articles/search.ejs', {
      title: 'List Article',
      articles: articles,
      moment: moment,
      currentPage: page,
      pages: Math.ceil(numOfProducts / resPerPage),
      numOfResults: numOfProducts,
      searchVal: searchQuery
    })

  } else {
    res.render('frontend/articles/search.ejs', { title: 'search', moment: moment })
  }

}

/**
 * post/postSearch
 * search title of arcticle
 */
exports.postSearch = async (req, res, next) => {
  try {
    const searchQuery = req.body.Search || req.query.search;

    if (!searchQuery) {
      res.render('frontend/articles/search.ejs', { title: 'Article search' })
    }
    const regex = new RegExp(util.escapeRegex(searchQuery), 'i');
    const resPerPage = 5; // results per page
    const page = req.params.page || 1; // Page 
    //find all article 
    const articles = await Article.find({ title: regex }).populate('author', ['profile.name', 'profile.picture']).populate('caterogyID', 'categoryName').sort({ "createdAt": -1 })
      .skip((resPerPage * page) - resPerPage)
      .limit(resPerPage);
    const numOfProducts = await Article.countDocuments({ title: regex });

    //show html page
    res.render('frontend/articles/search.ejs', {
      title: 'List Article',
      articles: articles,
      moment: moment,
      currentPage: page,
      pages: Math.ceil(numOfProducts / resPerPage),
      numOfResults: numOfProducts,
      searchVal: searchQuery
    })
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * get/getTags
 * list article of tags
 */
exports.getTags = (req, res, next) => {
  var queryParams = { tagList: { $in: [req.params.tag] } }
  Article.find(queryParams).populate('author', ['profile.name', 'profile.picture']).populate('caterogyID', 'categoryName').exec((err, articles) => {
    if (err) { return next(err); }
    res.render('frontend/articles/tags.ejs', { title: 'Tags List', moment: moment, articles: articles })
  })
}

/**
 * get/getTags
 * about author and list article of author
 */
exports.getAuthor = (req, res, next) => {
  User.findById(req.params.id).exec((err, authorUser) => {
    if (err) { return next(err); }
    Article.find({ author: req.params.id }).populate('caterogyID', 'categoryName').exec((err, articles) => {
      if (err) { return next(err); }
      const flagUser = false;
      if (req.user._id === authorUser._id) {
        flagUser = true;
      }
      res.render('frontend/articles/author.ejs', { title: 'About Author', moment: moment, authorUser: authorUser, articles: articles, flagUser: flagUser })
    });
  });
}
