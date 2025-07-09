const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  time: String,
  deleted: {
    type: Boolean,
    default: false
  },
  seenBy: {
  type: [String],
  default: []
  },
  archived: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
