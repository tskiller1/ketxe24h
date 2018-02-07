const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    user_id:String,
    full_name:String,
    token:String,
    fcm_token:String,
    lasted_device:String,
    total_news:Number,
    total_likes:Number,
    total_dislikes:Number,
    status_login:Number,
    type:Number//1: in app, 2: facebook
  });
  
  module.exports = mongoose.model("User", UserSchema);