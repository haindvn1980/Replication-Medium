/**
 * Module dependencies.
 */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require("chalk");
const MongoStore = require('connect-mongo')(session);
const upload = multer({ dest: path.join(__dirname, '/public/images') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const lusca = require('lusca');
const sass = require('node-sass-middleware');
var mkdirp = require('mkdirp');
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: 'process.env' });

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Controllers (route handlers).
 */
//front-end
const homeController = require('./controllers/frontend/home.controller.js');
const userController = require('./controllers/frontend/user.controller.js');
const contactController = require('./controllers/frontend/contact.controller.js');
const articleController = require('./controllers/frontend/article.controller.js');
const mediumController = require('./controllers/frontend/medium.controller.js');

//back-end
const adminController = require('./controllers/backend/admin.controller.js');
const categoryController = require('./controllers/backend/category.controller.js');
const articleAdminController = require('./controllers/backend/article.controller.js');
/**
 *  Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8888);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));

app.use(function (req, res, next) {
  res.locals.user = req.session.user;
  res.locals.categories = req.session.categories;
  res.locals.link = process.env.BASE_URL
  next();
});

// app.use((req, res, next) => {
//   lusca.csrf()(req, res, next);
// });

// app.use(lusca({
//   csrf: {
//     header: 'x-xsrf-token',
//   },
//   xframe: 'SAMEORIGIN',
//   hsts: {
//     maxAge: 31536000, //1 year, in seconds
//     includeSubDomains: true,
//     preload: true
//   },
//   xssProtection: true
// }));

//app.use(lusca.xframe('SAMEORIGIN'));
//app.use(lusca.xssProtection(true));
/**
 * Primary app routes.
 */
//home page
app.get('/', homeController.getIndex);
app.get('/home', passportConfig.isAuthenticated, homeController.getHome);

//*******account********************/
//register account
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
//login
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
//logout
app.get('/logout', userController.getLogout);
//forgot password
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
//reset
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
//profile
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
//save profile
app.post('/account/profile', upload.single('avatar'), passportConfig.isAuthenticated, userController.postUpdateProfile);
//change pw
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
//delete acc
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
//verify email
app.get('/account/verify', passportConfig.isAuthenticated, userController.getVerifyEmail);
app.get('/account/verify/:token', passportConfig.isAuthenticated, userController.getVerifyEmailToken);

//*******article********************/
//newstory
app.get('/newarticle', passportConfig.isAuthenticated, articleController.getNewArticle);
app.post('/newarticle', upload.single('mainImage'), passportConfig.isAuthenticated, articleController.postNewArticle);
app.get('/article/:id', passportConfig.isAuthenticated, articleController.getArticle);
app.get('/category/:id', passportConfig.isAuthenticated, articleController.getCategory);
app.get('/favorite/:id', passportConfig.isAuthenticated, articleController.getFavorite);
app.get('/bookmark/:id', passportConfig.isAuthenticated, articleController.getBookmark);
app.get('/removebookmark/:id', passportConfig.isAuthenticated, articleController.getRemoveBookmark);
app.get('/follow/:id', passportConfig.isAuthenticated, articleController.getFollow);
app.get('/unfollow/:id', passportConfig.isAuthenticated, articleController.getUnFollow);
app.post('/comment/:id', passportConfig.isAuthenticated, articleController.postComment);
app.get('/queue', passportConfig.isAuthenticated, articleController.getQueue);
app.get('/tags/:tag', passportConfig.isAuthenticated, articleController.getTags);
app.get('/author/:id', passportConfig.isAuthenticated, articleController.getAuthor);
app.get('/search/:page', passportConfig.isAuthenticated, articleController.getSearch);
app.post('/search/:page', passportConfig.isAuthenticated, articleController.postSearch);

//***************member************/
app.get('/member', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/upgrade', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/membership', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/getstarted', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/about', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/write', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/gift', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/help', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/contact', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/career', passportConfig.isAuthenticated, mediumController.getMember);
app.get('/policy', passportConfig.isAuthenticated, mediumController.getMember);

//*******contact********************/
//contact
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);

/****************************************************
 * 
 * ADMIN PAGE
 * 
*/
app.get('/admin', adminController.isAuthenticated, adminController.getAdminHome);
app.get('/admin/login', adminController.getLogin);
app.post('/admin/login', adminController.postLogin);
app.get('/admin/logout', adminController.getLogout);
//category
app.get('/admin/listcategory', adminController.isAuthenticated, categoryController.getListCategory);
app.get('/admin/addcategory', adminController.isAuthenticated, categoryController.getAddCategory);
app.post('/admin/addcategory', adminController.isAuthenticated, categoryController.postAddCategory);
app.get('/admin/editcategory/:id', adminController.isAuthenticated, categoryController.getEditCategory);
app.post('/admin/editcategory/:id', adminController.isAuthenticated, categoryController.postEditCategory);
app.get('/admin/deletecategory/:id', adminController.isAuthenticated, categoryController.getDeleteCategory);
app.get('/admin/updatecategory/:id', adminController.isAuthenticated, categoryController.getUpdatecategory);
//article
app.get('/admin/listarticle/:page', adminController.isAuthenticated, articleAdminController.getListArticle);
app.get('/admin/deletearticle/:id', adminController.isAuthenticated, articleAdminController.getDeleteArticle);
app.get('/admin/commentlist/:page', adminController.isAuthenticated, articleAdminController.getCommentList);
app.get('/admin/deletecomment/:id', adminController.isAuthenticated, articleAdminController.getDeleteComment);
//User
app.get('/admin/listuser/:page', adminController.isAuthenticated, adminController.getListUser);
app.get('/admin/deleteuser/:id', adminController.isAuthenticated, adminController.getDeleteUser);
app.get('/admin/changepassword', adminController.isAuthenticated, adminController.getChangePassword);
app.post('/admin/changepassword', adminController.isAuthenticated, adminController.postChangePassword);

/**
 * Start Express server.
 * error handlers
 */
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('frontend/error.ejs', {
      message: err.message,
      error: err
    });
  });
}
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('frontend/error.ejs', {
    message: err.message,
    error: {}
  });
});
//Start Express server.
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
