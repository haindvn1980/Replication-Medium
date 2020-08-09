const mongoose = require('mongoose');


const bookmarkSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  articleID: { type: mongoose.Schema.Types.ObjectId, ref: 'article' },
  status: { type: Boolean, default: true },
}, { timestamps: true });

const Bookmark = mongoose.model('bookmark', bookmarkSchema);
module.exports = Bookmark;