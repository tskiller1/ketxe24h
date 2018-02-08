var express = require("express");
var router = express.Router();
const Multer = require("multer");
const path = require("path");
const fs = require("fs");
var jwt = require("jsonwebtoken");
const request = require('request')

var utilities = require('../util/utilities')
var response = require('../util/response')
var config = require("../config");
var Locations = require('../models/Locations')
var News = require('../models/News')
var User = require('../models/User')

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 1 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
});
var storage = Multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/images");
    },
    filename: function (req, file, callback) {
        callback(
            null,
            "image" + "-" + Date.now() + path.extname(file.originalname)
        );
    }
});

router.post("/image", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(405, "You do not have permission"))
    }
    jwt.verify(req.query.token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(405, "You do not have permission"))
        }
        console.log(decode)
        var user_id = decode._id;
        var upload = Multer({
            storage: storage
        }).single("file");
        upload(req, res, err => {
            if (err) {
                return res.json(response.failure(405, err.message))
            }
            try {
                var bitmap = fs
                    .readFileSync(__dirname + "/../public/images/" + req.file.filename)
                    .toString("hex", 0, 4);
                if (!utilities.checkMagicNumbers(bitmap)) { //Kiểm tra xem file vừa lưu có phải là hình ảnh 
                    //nếu không thì xóa
                    try {
                        fs.unlinkSync(__dirname + "/../public/images/" + req.file.filename);
                        return res.json(response.failure(405, "This file is invailid format"))
                    } catch (err) {
                        return res.json(response.failure(405, err.message))
                    }
                }
                return res.json(response.success({
                    name: req.file.filename,
                    path: "/images/" + req.file.filename,
                    user: decode._id
                }))
            } catch (err) {
                return res.json(response.failure(405, err.message))
            }
        })
    })
})

router.post("/uploadForNews", (req, res) => {
    if (!req.query.token) {
        // req.flash('info', "You do not have permission")
        return res.redirect(`/upload?token=${req.query.token}`)
    }
    jwt.verify(req.query.token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(405, "You do not have permission"))
        }
        console.log(decode)
        var upload = Multer({
            storage: storage
        }).single("file");
        upload(req, res, err => {
            if (err) {
                return res.json(response.failure(405, err.message))
            }
            try {
                var bitmap = fs
                    .readFileSync(__dirname + "/../public/images/" + req.file.filename)
                    .toString("hex", 0, 4);
                if (!utilities.checkMagicNumbers(bitmap)) { //Kiểm tra xem file vừa lưu có phải là hình ảnh 
                    //nếu không thì xóa
                    try {
                        fs.unlinkSync(__dirname + "/../public/images/" + req.file.filename);
                        return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                    } catch (err) {
                        console.log(err)
                        // sendTextMessage(decode.user_id, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
                        return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                    }
                }
                else {
                    News
                        .findOneAndUpdate({ _id: decode.news_id }, { url_image: "/images/" + req.file.filename }, { news: true })
                        .then(news => {
                            console.log(news)
                            if (!news) {
                                // return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                            }
                            Locations
                                .findOneAndUpdate({ _id: news.location_id }, { lastest_image: news.url_image }, { new: true })
                                .then(location => {
                                    return sendTextMessage(decode.user_id, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
                                    // return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                                })
                                .catch(error => {
                                    console.log(error)
                                    return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                                })
                        })
                        .catch(error => {
                            console.log(error)
                            return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
                        })
                }
            } catch (err) {
                console.log(err)
                return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
            }
        })
    })
})

router.get("/", (req, res) => {
    if (!req.query.token) {
        return res.redirect("https://www.facebook.com/K%E1%BA%B9t-Xe-24H-201405677074189")
    }
    var obj = { token: req.query.token }
    return res.render('upload', obj)
})

function sendTextMessage(sender, text) {
    let messageData = { text: text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: config.chatbot_token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        // console.log(response)
    })
}

module.exports = router;
