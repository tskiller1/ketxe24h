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

router.post("/", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"))
    }
    jwt.verify(req.query.token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"))
        }
        console.log(decode)
        var upload = Multer({
            storage: storage
        }).single("file");
        upload(req, res, err => {
            if (err) {
                console.log(err)
                return res.json(response.failure(403, err.message))
            }
            try {
                var bitmap = fs
                    .readFileSync(__dirname + "/../public/images/" + req.file.filename)
                    .toString("hex", 0, 4);
                if (!utilities.checkMagicNumbers(bitmap)) { //Kiểm tra xem file vừa lưu có phải là hình ảnh 
                    //nếu không thì xóa
                    try {
                        fs.unlinkSync(__dirname + "/../public/images/" + req.file.filename);
                        return res.json(response.failure(403, "Không phải kiểu định dạng hình ảnh hoặc video"))
                    } catch (err) {
                        console.log(err)
                        return res.json(response.failure(403, err.message))
                    }
                }
                else {
                    News
                        .findOneAndUpdate({ _id: decode.news_id }, { url_image: "/images/" + req.file.filename }, { news: true })
                        .then(news => {
                            console.log(news)
                            if (!news) {
                                return res.json(response.failure(403, "Can not find this location"))
                            }
                            Locations
                                .findOneAndUpdate({ _id: news.location_id }, { lastest_image: "/images/" + req.file.filename }, { new: true })
                                .then(location => {
                                    console.log(location)
                                    return res.render('thank')
                                })
                                .catch(error => {
                                    console.log(error)
                                    return res.json(response.failure(403, error.message))
                                })
                        })
                        .catch(error => {
                            console.log(error)
                            return res.json(response.failure(403, error.message))
                        })
                }
            } catch (err) {
                console.log(err)
                return res.json(response.failure(403, error.message))
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

module.exports = router;
