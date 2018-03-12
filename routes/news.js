var express = require("express");
var jwt = require("jsonwebtoken");

var response = require('../util/response')
var utilities = require('../util/utilities')
var config = require('../config')

var News = require("../models/News");
var Locations = require("../models/Locations");
var User = require("../models/User");

var router = express.Router();

router.post("/like", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"))
    }
    if (!req.body.news_id) {
        return res.json(response.failure(404035, "Missing parameters"));
    }
    var news_id = req.body.news_id;
    jwt.verify(req.query.token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        var user_id = decode._id;
        User
            .findOne({ _id: user_id })
            .then(user => {
                if (!user) {
                    return res.json(response.failure(403, "You do not have permission"));
                }
                News
                    .findOne({ _id: news_id })
                    .then(news => {
                        if (!news) {
                            return res.json(response.failure(403, "Can not find this location"))
                        }
                        var likes = news.likes;
                        if (likes.indexOf(user_id) === -1) {
                            News
                                .findOneAndUpdate({ _id: news_id }, { $push: { likes: user_id }, count_like: news.count_like + 1 }, { new: true }, (err, doc) => {
                                    if (err) {
                                        return res.json(response.failure(500, err.message))
                                    }
                                    User
                                        .findOneAndUpdate({ user_id: doc.user_id }, { $inc: { total_likes: 1 } }, { new: true }, (err, doc) => {
                                            if (err) {
                                                return res.json(response.failure(500, err.message))
                                            }
                                            var obj = doc.toObject();
                                            delete obj.__v;
                                            delete obj.likes;
                                            delete obj.dislikes
                                            return res.json(response.success(obj))
                                        })
                                })
                        }
                        else {
                            News
                                .findOneAndUpdate({ _id: news_id }, { $pull: { likes: user_id }, count_like: news.count_like - 1 }, { new: true }, (err, doc) => {
                                    if (err) {
                                        return res.json(response.failure(500, err.message))
                                    }
                                    User
                                        .findOneAndUpdate({ user_id: doc.user_id }, { $inc: { total_likes: -1 } }, { new: true }, (err, doc) => {
                                            if (err) {
                                                return res.json(response.failure(500, err.message))
                                            }
                                            var obj = doc.toObject();
                                            delete obj.__v;
                                            delete obj.likes;
                                            delete obj.dislikes
                                            return res.json(response.success(obj))
                                        })
                                })
                        }
                    })
                    .catch(error => {
                        return res.json(response.failure(500, error.message))
                    })
            })
    })
})

router.post("/dislike", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"))
    }
    if (!req.body.news_id) {
        return res.json(response.failure(403, "Missing parameters"));
    }
    var news_id = req.body.news_id;
    jwt.verify(req.query.token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        var user_id = decode._id;
        User
            .findOne({ _id: user_id })
            .then(user => {
                if (!user) {
                    return res.json(response.failure(403, "You do not have permission"));
                }
                News
                    .findOne({ _id: news_id })
                    .then(news => {
                        if (!news) {
                            return res.json(response.failure(403, "Can not find this location"))
                        }
                        var dislike = news.dislikes;
                        if (dislike.indexOf(user_id) === -1) {
                            News
                                .findOneAndUpdate({ _id: news_id }, { $push: { dislikes: user_id }, count_dislike: news.count_dislike + 1 }, { new: true }, (err, doc) => {
                                    if (err) {
                                        return res.json(response.failure(500, err.message))
                                    }
                                    User
                                        .findOneAndUpdate({ user_id: doc.user_id }, { $inc: { total_dislikes: 1 } }, { new: true }, (err, doc) => {
                                            if (err) {
                                                return res.json(response.failure(500, err.message))
                                            }
                                            var obj = doc.toObject();
                                            delete obj.__v;
                                            delete obj.likes;
                                            delete obj.dislikes
                                            return res.json(response.success(obj))
                                        })
                                })
                        }
                        else {
                            News
                                .findOneAndUpdate({ _id: news_id }, { $pull: { dislikes: user_id }, count_dislike: news.count_dislike - 1 }, { new: true }, (err, doc) => {
                                    if (err) {
                                        return res.json(response.failure(500, err.message))
                                    }
                                    User
                                        .findOneAndUpdate({ user_id: doc.user_id }, { $inc: { total_dislikes: -1 } }, { new: true }, (err, doc) => {
                                            if (err) {
                                                return res.json(response.failure(500, err.message))
                                            }
                                            var obj = doc.toObject();
                                            delete obj.__v;
                                            delete obj.likes;
                                            delete obj.dislikes
                                            return res.json(response.success(obj))
                                        })
                                })
                        }
                    })
                    .catch(error => {
                        return res.json(response.failure(500, error.message))
                    })
            })
    })
})

router.get("/", (req, res) => {
    if (!req.query.location_id) {
        return res.json(response.failure(404, "Not Found"));
    }
    var limit = 15;
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
        if (limit < 0) {
            return res.json(response.failure(403, "Limit must be greater than 0"));
        }
        if(limit === 0){
            limit = 15;
        }
    }
    var page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
        if (page < 0) {
            return res.json(response.failure(403, "Page must be greater than 0"));
        }
        if(page === 0){
            page = 1;
        }
    }
    var skip = limit * (page - 1)
    var location_id = req.query.location_id;
    if (!req.query.token) {
        News
            .find({ location_id: location_id })
            .select({ __v: 0, likes: 0, dislikes: 0 })
            .populate({
                path: 'user_id',
                select: 'total_news total_likes total_dislikes full_name'
            })
            .limit(limit)
            .skip(skip)
            .sort({ create_at: -1 })
            .then(newsList => {
                // for (var i = 0; i < newsList.length; i++) {
                //     newsList[i] = newsList[i].toObject()
                // if (newsList[i].type == 1) {
                //     newsList[i].url_image = "https://" + req.hostname + "/" + newsList[i].url_image
                // }
                // }
                News
                    .count({ location_id: location_id }, (err, count) => {
                        if (err) {
                            return res.json(response.failure(500, err.message))
                        }
                        var has_more_page = false;
                        if (skip + newsList.length != count) {
                            has_more_page = true;
                        }
                        return res.json(response.successList(newsList, count, page, has_more_page))
                    })
            })
            .catch(error => {
                return res.json(response.failure(500, error.message))
            })
    } else {
        jwt.verify(req.query.token, config.app_secret, (err, decode) => {
            if (err) {
                return res.json(response.failure(403, "You do not have permission"))
            }
            News
                .find({ location_id: location_id })
                .populate({
                    path: 'user_id',
                    select: 'total_news total_likes total_dislikes full_name'
                })
                .limit(limit)
                .skip(skip)
                .select({ __v: 0 })
                .sort({ create_at: -1 })
                .then(newsList => {
                    for (var i = 0; i < newsList.length; i++) {
                        newsList[i] = newsList[i].toObject()
                        // if (newsList[i].type == 1) {
                        //     newsList[i].url_image = "https://" + req.hostname + newsList[i].url_image
                        // }
                        if (newsList[i].likes.indexOf(decode._id) !== -1) {
                            newsList[i].isLike = true
                        } else {
                            newsList[i].isLike = false
                        }
                        if (newsList[i].dislikes.indexOf(decode._id) !== -1) {
                            newsList[i].isDisike = true
                        } else {
                            newsList[i].isDislike = false
                        }
                        delete newsList[i].likes
                        delete newsList[i].dislikes
                    }
                    News
                        .count({ location_id: location_id }, (err, count) => {
                            if (err) {
                                return res.json(response.failure(500, err.message))
                            }
                            var has_more_page = false;
                            if (skip + newsList.length != count) {
                                has_more_page = true;
                            }
                            return res.json(response.successList(newsList, count, page, has_more_page))
                        })
                })
                .catch(error => {
                    return res.json(response.failure(500, error.message))
                })
        })
    }
})

router.get("/:id", (req, res) => {
    if (!req.params.id) {
        return res.json(response.failure(404, "Not Found"));
    }
    var id = req.params.id;
    News
        .find({ _id: id })
        .select({ __v: 0, likes: 0, dislikes: 0 })
        .populate({
            path: 'user_id',
            select: 'total_news total_likes total_dislikes full_name'
        })
        .then(news => {
            if(!news){
                return res.json(response.failure(403, "Can not find this news"))
            }
            return res.json(response.success(news))
        })
        .catch(error => {
            return res.json(response.failure(500, error.message))
        })
})

module.exports = router;
