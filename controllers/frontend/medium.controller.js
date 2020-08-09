const validator = require('validator');
var session = require('express-session');

exports.getMember = (req, res, next) => {
  res.render('frontend/medium/building.ejs', { title: 'The page is under construction' })
}