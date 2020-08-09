const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, require: true, unique: true, sparse: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: Boolean,
  isAdmin: { type: Boolean, default: false },
  status: { type: Boolean, default: true },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null }],
  facebook: String,
  google: String,

  profile: {
    name: String,
    gender: String,
    location: String,
    website: String,
    picture: String,
    description: String
  }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
//hàm được thực hiện trước khi lưu bản ghi vào db.
userSchema.pre('save', function save(next) {
  const user = this;
  //nếu pw đã được sửa đổi trước đó
  if (!user.isModified('password')) { return next(); }
  //A library to help you hash passwords.
  bcrypt.genSalt(10, (err, salt) => {
    //if has error
    if (err) { return next(err); }
    //băm pw ra -auto-gen a salt and hash
    bcrypt.hash(user.password, salt, (err, hash) => {
      //if has error
      if (err) { return next(err); }
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};


const User = mongoose.model('users', userSchema);
module.exports = User;