const mongoose = require("mongoose");
const NewsSchema = new mongoose.Schema({
  description: String,
  user_id: String,
  level: Number,
  count_like: Number,
  count_dislike: Number,
  url_image: String,
  created_at: String,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  type: Number,//1: in app, 2: on facebook
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Locations"
  },
  likes: [],
  dislikes: [],
});

module.exports = mongoose.model("News", NewsSchema);