
var express = require("express");
var User = require("../models/User");
var jwt = require("jsonwebtoken");
var response = require('../util/response')
var config = require('../config')
var router = express.Router();

router.get("/", function (req, res) {
    return res.json(response.failure(404, "Not Found"));
});

router.post("/login", (req, res) => {
    if (!req.body.user_id || !req.body.token || !req.body.device_id) {
        return res.json(response.failure(405, "Missing parameters"));
    }
    var userID = req.body.user_id;
    var fcm_token = req.body.token;
    var deviceID = req.body.device_id;
    req.admin
        .auth()
        .getUser(userID)
        .then(function (userRecord) {
            User
                .findOne({ user_id: userID })
                .select({ __v: 0 })
                .then(user => {
                    if (!user || user == null) {
                        let newUser = new User({
                            user_id: userID,
                            full_name: userRecord.displayName,
                            token: "",
                            fcm_token: fcm_token,
                            lasted_device: deviceID,
                            total_news: 0,
                            total_likes: 0,
                            total_dislikes: 0,
                            status_login: 1,
                            type: 1
                        });
                        newUser.save()
                            .then(user => {
                                let token = jwt.sign(
                                    {
                                        _id: user._id,
                                        user_id: user.user_id
                                    },
                                    config.app_secret
                                );
                                User
                                    .findOneAndUpdate({ _id: user._id }, { token: token }, { new: true })
                                    .select({ __v: 0 })
                                    .then(user => {
                                        return res.json(response.success(user))
                                    })
                                    .catch(error => {
                                        return res.json(response.failure(405, error.message))
                                    })
                            })
                            .catch(error => {
                                return res.json(response.failure(405, error.message))
                            })
                    } else {
                        user = user.toObject();
                        user.fullname = userRecord.displayName;
                        return res.json(response.success(user))
                    }
                })
        })
        .catch(function (error) {
            return res.json(response.failure(405, error.message))
        });
})

router.post("/logout", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"));
    }
    var token = req.query.token;
    jwt.verify(token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        User
            .findOneAndUpdate({ _id: decode._id }, { $set: { status_login: 2 } }, { new: true })
            .then(user => {
                if (user) {
                    req.admin
                        .auth()
                        .getUser(user.user_id)
                        .then(function (userRecord) {
                            return res.json(response.success({}))
                        })
                        .catch(function (error) {
                            return res.json(response.failure(405, error.message))
                        });
                } else {
                    return res.json(response.failure(405, "Can not find this user"))
                }
            }).catch(error => {
                return res.json(response.failure(405, error.message))
            })

    })
})

router.get("/:id", (req, res) => {
    if (!req.params.id) {
        return res.json(response.failure(404, "Not Found"));
    }
    var uid = req.params.id;
    User
        .findOne({ _id: uid })
        .select({ __v: 0, token: 0, fcm_token: 0, lasted_device: 0, status_login: 0 })
        .then(user => {
            if (user) {
                req.admin
                    .auth()
                    .getUser(user.user_id)
                    .then(function (userRecord) {
                        return res.json(response.success(user))
                    })
                    .catch(error => {
                        return res.json(response.failure(405, error.message))
                    })
            } else {
                return res.json(response.failure(405, "Can not find this user"))
            }
        })
        .catch(function (error) {
            return res.json(response.failure(405, error.message))
        });
})

module.exports = router;
