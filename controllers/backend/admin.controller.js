const validator = require('validator');
const passport = require('passport');
const moment = require('moment');
const User = require('../../models/user.model.js')
const Article = require('../../models/article.model.js');
const Comment = require('../../models/comment.model.js');

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.isAdmin === false) {
      res.redirect('/admin/login');
    }
    return next();
  }

  res.redirect('/admin/login');
};
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/*******************************************************************
 * GET /amdin 
 * home page.
 *******************************************************************/
exports.getAdminHome = async (req, res) => {
  const numOfUser = await User.countDocuments();
  const numOfArticle = await Article.countDocuments();
  const numOfComment = await Comment.countDocuments();
  if (req.user.isadmin === false) {
    res.render('backend/login.ejs');
  } else {
    res.render('backend/index.ejs', { numOfUser: numOfUser, numOfArticle: numOfArticle, numOfComment: numOfComment });
  }
}

/*******************************************************************
 * GET /login
 * Login page.
 *******************************************************************/
exports.getLogin = (req, res) => {
  res.render('backend/login.ejs');
}

/*******************************************************************
 * POST /login
 * Login page.
 *******************************************************************/
exports.postLogin = (req, res, next) => {

  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
  if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/admin/login');
  }
  //same the Gmail do not count periods as a character in an email address
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  //call middleware passport.authenticate 
  //get req.body.username and req.body.passport =>set to verify local.
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', { msg: 'Username or password are not valid.' });
      return res.redirect('/admin/login');
    }
    //find token in db and check have expires???
    User
      .findOne({ email: req.body.email })
      .where({ isAdmin: true })
      .exec((err, user) => {
        if (err) { return next(err); }
        if (!user) {
          req.flash('errors', { msg: 'Username is not a admin.' });
          return res.redirect('/admin/login');
        }
        req.logIn(user, (err) => {
          if (err) { return next(err); }
          req.session.user = user;
          //redirect to home page
          return res.redirect(req.session.returnTo || '/admin');
        });
      });

  })(req, res, next);
}

/*******************************************************************
 * POST /logout
 * Logout page.
 *******************************************************************/
exports.getLogout = (req, res, next) => {
  //call function logout Passport  - cancel user session
  req.logout();
  //destroy session
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.redirect('/admin/login');
  })
}

/*******************************************************************
 * GET /listuser
 * List user page.
 *******************************************************************/
exports.getListUser = async (req, res, next) => {
  const resPerPage = 10; // results per page
  const page = req.params.page || 1; // Page 
  //find all article 
  const users = await User.find().sort({ "createdAt": -1 })
    .skip((resPerPage * page) - resPerPage)
    .limit(resPerPage);
  const numOfUser = await User.countDocuments();
  //show html page
  res.render('backend/listuser.ejs', {
    title: 'List User',
    users: users,
    moment: moment,
    currentPage: page,
    pages: Math.ceil(numOfUser / resPerPage),
    numOfResults: numOfUser
  });
}

/**
 * GET/  delete User
 * getDeleteuser
 */
exports.getDeleteUser = (req, res, next) => {
  //find category by ID and save value
  User.findByIdAndDelete(req.params.id, function (err) {
    if (err) return next(err);
    return res.redirect('/admin/listuser/1')
  });
}

/**
 * GET / changepassword
 * getChangePassword
 */

exports.getChangePassword = (req, res, next) => {
  return res.render('backend/changepassword.ejs');
}

/**
 * POST / changepassword
 * postChangePassword
 */
exports.postChangePassword = (req, res, next) => {
  //check data input
  const validationErrors = [];
  if (!validator.isLength(req.body.password, { min: 6 })) validationErrors.push({ msg: 'Password must be at least 6 characters long' });
  if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: ' The two passwords do not match' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/admin/changepassword');
  }


  //find user by ID. Results assigned to the variable user.
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    //before save call function userSchema.pre('save', function save(next) ) để mã hóa
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/admin/changepassword');
    });
  });
}
