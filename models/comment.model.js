const mongoose = require('mongoose');


const commentSchema = new mongoose.Schema({
  body: { type: String, require: true, unique: true, sparse: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'article' },
  status: { type: Boolean, default: true },
}, { timestamps: true });

const Comment = mongoose.model('comment', commentSchema);
module.exports = Comment;