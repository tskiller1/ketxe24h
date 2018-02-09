var express = require("express");
var admin = require("firebase-admin");
var jwt = require("jsonwebtoken");
var request = require("request");

var config = require('../config')
var response = require('../util/response')

var Locations = require("../models/Locations");
var News = require("../models/News");

var router = express.Router();

router.get("/:location_id", (req, res) => {
    if (!req.query.start_date || !req.query.end_date || !req.params.location_id) {
        return res.json(response.failure("Missing paramaters"));
    }
    var startDate = new Date(req.query.start_date);
    var endDate = new Date(req.query.end_date);
    var location_id = req.params.location_id;
    location = {};
    Locations
        .findOne({ _id: location_id })
        .select({ __v: 0, saves: 0 })
        .then(location => {
            if (!location) {
                return res.json(response.failure(403, "Can not find this location"))
            }
            News
                .find({ location_id: location_id })
                .then(news => {
                    var list = [];
                    for (var i in news) {
                        var dt = new Date(news[i].created_at);
                        if (dt > startDate && dt < endDate) {
                            list.push({
                                new_id: news[i].id,
                                level: news[i].level,
                                count_like: news[i].count_like,
                                count_dislike: news[i].count_dislike,
                                day: dt.getDay(),
                                hour: dt.getUTCHours(),
                                date: dt.getUTCDate(),
                                month: dt.getUTCMonth(),
                                year: dt.getUTCFullYear()
                            });
                        }
                    }
                    return res.json(response.success({
                        location: location,
                        chart_data: list
                    }))
                })
                .catch(error => {
                    return res.json(response.failure(405, error.message))
                })
        })
        .catch(error => {
            return res.json(response.failure(405, error.message))
        })
})

module.exports = router;
