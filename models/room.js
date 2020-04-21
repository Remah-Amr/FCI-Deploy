const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name : String,
  code : String,
  users : [{
      type : Schema.Types.ObjectId,
      ref : 'user'
  }],
  owner : {
      type : Schema.Types.ObjectId,
      ref : 'user'
  },
  imageUrl: String,
  description : String
});

module.exports = mongoose.model('room',roomSchema);
