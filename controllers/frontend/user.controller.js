const validator = require('validator');
var session = require('express-session');
const passport = require('passport');
const crypto = require('crypto');
const { promisify } = require('util');
const nodemailer = require('nodemailer');
const randomBytesAsync = promisify(crypto.randomBytes);
const User = require('../../models/user.model.js');

/*********************************************************************
 * GET /logout
 * Log out.
 ********************************************************************/
exports.getLogout = (req, res) => {
  //call function logout Passport  - cancel user session
  req.logout();
  //destroy session
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.redirect('/');
  })
}
/*******************************************************************
 * GET /signup
 * Signup page.
 *******************************************************************/
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/home');
  }
  res.render('frontend/account/signup.ejs', { title: 'Create Account' });
}

/****************************************************************
 * POST /signup
 * Create a new local account.
 * step 1: check input => empty, format, the same between  2 passwords. 
 * If has a error, show error message. Else next step
 * step 2: Check if the user already exists 
 * step 3: save data to db
 ***************************************************************/
exports.postSignup = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
  if (!validator.isLength(req.body.password, { min: 6 })) validationErrors.push({ msg: 'Password must be at least 6 characters long' });
  if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Passwords do not match' });
  //check error, if has a error, show error mesage to html
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/signup');
  }
  //same the Gmail do not count periods as a character in an email address
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  //set data to object User db.
  const user = new User({
    email: req.body.email,
    password: req.body.password,
    profile: { description: '' }
  });

  //check username (email) is existing? 
  User.findOne({ email: req.body.email }, (err, existingUser) => {
    //check error
    if (err) { return next(err); }
    //if Username already exists in db, show error in html page
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    user.profile.picture = '375cb0e888fded5685abc4c3c51f663e';
    //save data to db
    user.save((err) => {
      if (err) { return next(err); }
      //call function login and redirect to home page. Node: start session
      req.logIn(user, (err) => {
        if (err) { return next(err); }
        req.session.user = user;
        res.redirect('/home');
      });
    });
  });
};

/**
* GET /login
* Login page.
*/
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/home');
  }
  res.render('frontend/account/login.ejs', { title: 'Login' });
}

/****************************************************************
 * POST /login
 * Create a new local account.
 * step 1: check input => empty, format. 
 * If has a error, show error message. Else next step
 * step 2: check data in db. if has a error =>show error. else next step
 * step 3: call login set session for user.
 ***************************************************************/
exports.postLogin = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
  if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/login');
  }
  //same the Gmail do not count periods as a character in an email address
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  //call middleware passport.authenticate 
  //get req.body.username and req.body.passport =>set to verify local.
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    //not the user isn't found.
    if (!user) {
      req.flash('errors', { msg: 'Username or password are not valid.' });
      return res.redirect('/login');
    }
    //call login with user inform
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.session.user = user;
      //redirect to home page
      res.redirect(req.session.returnTo || '/home');
    });
  })(req, res, next);
}

/****************************************************************
 * GET /Forgot
 * Log out.
 ****************************************************************/
exports.getForgot = (req, res) => {
  //kiem tra authen
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('frontend/account/forgot', {
    title: 'Forgot Password'
  });
}

/******************************************************************
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 * step 1: check error input =>send error to html page
 * step 2: find email in db. If not find => show error to html page. Else next step
 * step 3: create random token
 * step 4: save data to db and send email
 *****************************************************************/
exports.postForgot = (req, res, next) => {
  //check input
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/forgot');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  //gen a string random
  const createRandomToken = randomBytesAsync(16).then((buf) => buf.toString('hex'));
  //var
  const setRandomToken = (token) =>
    //find email ind db.
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        req.flash('errors', { msg: 'Account with that email address does not exist.' });
      } else {
        //save user to User.
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user = user.save();
      }
      return user;
    });
  //send email for user with link
  const sendForgotPasswordEmail = (user) => {
    if (!user) { return; }
    const token = user.passwordResetToken;
    //setup option for nodemail
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ID_USER,
        pass: process.env.ID_PASSWORD
      }
    });
    //setup email content
    const mailOptions = {
      to: user.email,
      from: 'medium@gmail.com',
      subject: 'Reset your password on Medium',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            http://${req.headers.host}/reset/${token}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };
    //call send mail with mail options. user.email =req.body.email
    return transporter.sendMail(mailOptions)
      .then(() => {
        //send email success
        req.flash('info', { msg: `The An e-mail has been sent to ${user.email} with further instructions.` });
      })
      //handle email when has errors
      .catch((err) => {
        //seve log for check and show error for html page
        console.log('ERROR: Could not send forgot password email after security downgrade.\n', err);
        req.flash('errors', { msg: 'Error sending the password reset message. Please try again shortly.' });
        return err;
      });
  };
  //step 1,2,3
  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => res.redirect('/forgot'))
    .catch(next);
}

/*********************************************************************
 * GET /reset/:token
 * Reset Password page.
 ********************************************************************/
exports.getReset = (req, res, next) => {

  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  //check error input as params
  const validationErrors = [];
  if (!validator.isHexadecimal(req.params.token)) validationErrors.push({ msg: 'Invalid Token. Please retry.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/reset');
  }
  //find token in db and check have expires???
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/reset');
      }
      res.render('frontend/account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 * step 1: check param & check password
 * step 2: findOne token in db with expires date
 * step 3: reset password
 * step 4: send email to user
 */
exports.postReset = (req, res, next) => {
  //check input
  const validationErrors = [];
  if (!validator.isLength(req.body.password, { min: 6 })) validationErrors.push({ msg: 'Password must be at least 6 characters long' });
  if (req.body.password !== req.body.confirmpassword) validationErrors.push({ msg: 'Passwords do not match' });
  if (!validator.isHexadecimal(req.params.token)) validationErrors.push({ msg: 'Invalid Token.  Please retry.' });

  //if has error back to html page
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ID_USER,
        pass: process.env.ID_PASSWORD
      }
    });
    //set options of email
    const mailOptions = {
      to: user.email,
      from: 'medium@gmail.com',
      subject: 'Medium password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
      })
      .catch((err) => {
        //save log
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', { msg: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.' });
        return err;
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/'); })
    .catch((err) => next(err));
};

/**
 * GET /Account
 * 
 ****/
exports.getAccount = (req, res, next) => {
  res.render('frontend/account/profile.ejs', {
    title: 'Account Management', user: req.user
  });
}

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });

  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/account');
  }
  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  //find id
  User.findById(req.user.id).exec((err, user) => {
    if (err) { return next(err) }

    //check email, if not email in db set email vrified is false.
    if (user.email != req.body.email) {
      user.emailVerified = false;
    }
    //set values of email
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.profile.description = req.body.description || '';

    if (req.file) {
      user.profile.picture = req.file.filename;
    }

    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.session.user = null;
      req.session.user = user;
      //success
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/account');
    });
  });

}

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  const validationErrors = [];
  if (!validator.isLength(req.body.password, { min: 6 })) validationErrors.push({ msg: 'Password must be at least 6 characters long' });
  if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Passwords do not match' });
  //neu co thi show loi
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/account');
  }
  //find user by ID. Results assigned to the variable user.
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    //before save call function userSchema.pre('save', function save(next) ) để mã hóa
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.deleteOne({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/verify
 * Verify email address
 * step 1: createRandomToken
 * step 2: setRandomToken to db
 * step 3: sendVerifyEmail
 */
exports.getVerifyEmail = (req, res, next) => {
  //check user if user verified => done
  if (req.user.emailVerified) {
    req.flash('info', { msg: 'The email address has been verified.' });
    return res.redirect('/account');
  }
  //check email
  if (!validator.isEmail(req.user.email)) {
    req.flash('errors', { msg: 'The email address is invalid or disposable and can not be verified.  Please update your email address and try again.' });
    return res.redirect('/account');
  }
  //create random string called token
  const createRandomToken = randomBytesAsync(16).then((buf) => buf.toString('hex'));
  //tạo token random
  const setRandomToken = (token) => {
    User
      .findOne({ email: req.user.email })
      .then((user) => {
        user.emailVerificationToken = token;
        user = user.save();
      });
    return token;
  };
  //gui email
  const sendVerifyEmail = (token) => {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ID_USER,
        pass: process.env.ID_PASSWORD
      }
    });
    //setup otions email, to:from:subject:body
    const mailOptions = {
      to: req.user.email,
      from: 'medium@gmail.com',
      subject: 'Please verify your email address on Medium',
      text: `Thank you for registering with hackathon-starter.\n\n
        This verify your email address please click on the following link, or paste this into your browser:\n\n
        http://${req.headers.host}/account/verify/${token}\n\n
        \n\n
        Thank you!`
    };
    //gui email
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('info', { msg: `An e-mail has been sent to ${req.user.email} with further instructions.` });
      })
      .catch((err) => {
        //bao loi khong gui duoc email
        console.log('ERROR: Could not send verifyEmail email after security downgrade.\n', err);
        req.flash('errors', { msg: 'Error sending the email verification message. Please try again shortly.' });
        return err;
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendVerifyEmail)
    .then(() => res.redirect('/account'))
    .catch(next);
};

/**
 * GET /account/verify/:token
 * Verify email address
 * when email of used get a mail from medium. User clicks to link 
 */
exports.getVerifyEmailToken = (req, res, next) => {
  //if user verified (kích hoạt) =>done
  if (req.user.emailVerified) {
    req.flash('info', { msg: 'The email address has been verified.' });
    return res.redirect('/account');
  }
  //check input
  const validationErrors = [];
  if (req.params.token && (!validator.isHexadecimal(req.params.token))) validationErrors.push({ msg: 'Invalid Token.  Please retry.' });
  if (validationErrors.length) {
    req.flash('errors', validationErrors);
    return res.redirect('/account');
  }

  if (req.params.token === req.user.emailVerificationToken) {
    User
      .findOne({ email: req.user.email })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'There was an error in loading your profile.' });
          return res.redirect('back');
        }
        user.emailVerificationToken = '';
        user.emailVerified = true;
        user = user.save();
        req.flash('info', { msg: 'Thank you for verifying your email address.' });
        return res.redirect('/account');
      })
      .catch((error) => {
        console.log('Error saving the user profile to the database after email verification', error);
        req.flash('errors', { msg: 'There was an error when updating your profile.  Please try again later.' });
        return res.redirect('/account');
      });
  } else {
    req.flash('errors', { msg: 'The verification link was invalid, or is for a different account.' });
    return res.redirect('/account');
  }
};

