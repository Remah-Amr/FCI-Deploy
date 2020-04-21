const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const examSchema = new Schema({
  name : String,
  duration : String,
  fullMark : Number,
  owner : {
      type : Schema.Types.ObjectId,
      ref : 'user'
  },
  users : [{
      userId :{
        type : Schema.Types.ObjectId,
        ref : 'user'
      },
      degree : {
          type : Number
      }
  }],
  code : String
});

module.exports = mongoose.model('exam',examSchema);
