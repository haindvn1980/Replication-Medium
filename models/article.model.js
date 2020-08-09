const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  slug: { type: String, lowercase: true, unique: true },
  caterogyID: { type: mongoose.Schema.Types.ObjectId, ref: 'category' },
  title: { type: String },
  description: { type: String },
  bodyArticle: { type: String },
  mainImage: { type: String, require: true },
  favoritesCount: { type: Number, default: 0 },
  minRead: { type: Number, default: 1 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'comment' }],
  tagList: [{ type: String }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  status: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now() },
  endDate: { type: Date, default: null }
}, { timestamps: true });

const Article = mongoose.model('article', articleSchema);
module.exports = Article;