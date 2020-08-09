const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({
  categoryName: { type: String, require: true, unique: true, sparse: true },
  Order: { type: Number },
  status: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now() },
  endDate: { type: Date, default: null }
}, { timestamps: true });

const Category = mongoose.model('category', categorySchema);
module.exports = Category;