var express = require("express");
var router = express.Router();
const Multer = require("multer");
const path = require("path");
const fs = require("fs");
var jwt = require("jsonwebtoken");

var utilities = require('../util/utilities')
var response = require('../util/response')
var config = require("../config");

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

router.get("/", (req, res) => {
    return res.json(response.failure(404, "Not Found"))
})

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

module.exports = router;
