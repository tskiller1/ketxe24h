var express = require("express");
var jwt = require("jsonwebtoken");
var NodeGeocoder = require("node-geocoder");
var request = require("request");
var polyline = require('polyline');

var response = require('../util/response')
var utilities = require('../util/utilities')
var config = require('../config')

var News = require("../models/News");
var Locations = require("../models/Locations");
var User = require("../models/User");

var router = express.Router();

const options = {
    provider: "google",
    // Optional depending on the providers
    httpAdapter: "https", // Default
    apiKey: config.api_key, // for Mapquest, OpenCage, Google Premier
    formatter: null // 'gpx', 'string', ...
};

const geocoder = NodeGeocoder(options);

router.get("/", function (req, res) {
    var limit = 15;
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
        if (limit < 0) {
            return res.json(response.failure(403, "Limit must be greater than 0"));
        }
        if (limit === 0) {
            limit = 15;
        }
    }
    var page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
        if (page < 0) {
            return res.json(response.failure(403, "Page must be greater than 0"));
        }
        if (page === 0) {
            page = 1;
        }
    }
    var skip = limit * (page - 1)

    Locations
        .find({ status: true })
        .select({ __v: 0, saves: 0 })
        .limit(limit)
        .skip(skip)
        .sort({ last_modify: -1 })
        .then(locations => {
            Locations
                .count({}, (err, count) => {
                    if (err) {
                        return res.json(response.failure(500, err.message))
                    }
                    var has_more_page = false;
                    if (skip + locations.length != count) {
                        has_more_page = true;
                    }
                    return res.json(response.successList(locations, count, page, has_more_page))
                })
        })
        .catch(error => {
            return res.json(response.failure(500, error.message))
        })
});

router.get("/loadByDistance", (req, res) => {
    if (!req.query.latitude || !req.query.longitude || !req.query.distance) {
        return res.json(response.failure(404, "Not Found"));
    }
    var latitude = parseFloat(req.query.latitude);
    var longitude = parseFloat(req.query.longitude);
    var distance = parseFloat(req.query.distance);
    var point = {
        type: "Point",
        coordinates: [longitude, latitude]
    }
    Locations.aggregate(
        [
            {
                $geoNear: {
                    near: point,
                    spherical: true,
                    distanceField: "distance",
                    maxDistance: distance,
                    query: { status: true }
                }
            },
            {
                $project: {
                    __v: 0,
                    saves: 0
                }
            }
        ],
        function (err, locations) {
            // do what you want with the results here
            if (err) {
                return res.json(response.failure(500, err.message))
            }
            return res.json(response.success(locations))
        }
    )
})

router.get("/favourite", (req, res) => {
    if (!req.query.lat1 || !req.query.long1 || !req.query.distance) {
        return res.json(response.failure(404, "Missing parameters"));
    }
    var lat1 = parseFloat(req.query.lat1);
    var long1 = parseFloat(req.query.long1);
    var distance = parseFloat(req.query.distance);
    var point = {
        type: "Point",
        coordinates: [long1, lat1]
    }

    Locations.aggregate(
        [
            {
                $geoNear: {
                    near: point,
                    spherical: true,
                    distanceField: "distance",
                    maxDistance: distance,
                    query: { status: true }
                }
            },
            {
                $project: {
                    __v: 0,
                    saves: 0
                }
            }
        ],
        function (err, locations1) {
            // do what you want with the results here
            if (err) {
                console.log(err)
                return res.json(response.failure(500, err.message))
            }
            if (req.query.lat2 && req.query.long2) {
                var lat2 = parseFloat(req.query.lat2);
                var long2 = parseFloat(req.query.long2);
                var point2 = {
                    type: "Point",
                    coordinates: [long2, lat2]
                }
                Locations.aggregate(
                    [
                        {
                            $geoNear: {
                                near: point2,
                                spherical: true,
                                distanceField: "distance",
                                maxDistance: distance,
                                query: { status: true }
                            }
                        },
                        {
                            $project: {
                                __v: 0,
                                saves: 0
                            }
                        }
                    ],
                    function (err, locations2) {
                        // do what you want with the results here
                        if (err) {
                            return res.json(response.failure(500, err.message))
                        }
                        if (req.query.lat3 && req.query.long3) {
                            var lat3 = parseFloat(req.query.lat3);
                            var long3 = parseFloat(req.query.long3);
                            var point3 = {
                                type: "Point",
                                coordinates: [long3, lat3]
                            }
                            Locations.aggregate(
                                [
                                    {
                                        $geoNear: {
                                            near: point3,
                                            spherical: true,
                                            distanceField: "distance",
                                            maxDistance: distance,
                                            query: { status: true }
                                        }
                                    },
                                    {
                                        $project: {
                                            __v: 0,
                                            saves: 0
                                        }
                                    }
                                ],
                                function (err, locations3) {
                                    // do what you want with the results here
                                    if (err) {
                                        return res.json(response.failure(500, err.message))
                                    }
                                    var location = locations1.concat(locations2)
                                    var result = location.concat(locations3)
                                    return res.json(response.success(result))
                                })
                        }
                        else {
                            var location = locations1.concat(locations2)
                            return res.json(response.success(location))
                        }
                        // return res.json(response.success(locations))
                    })
                // return res.json(response.success(locations))
            }
            else {
                return res.json(response.success(locations1))
            }
        })
})

router.get("/save", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"));
    }
    var limit = 15;
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
        if (limit <= 0) {
            return res.json(response.failure(403, "Limit must be greater than 0"));
        }
    }
    var page = 1
    if (req.query.page) {
        page = parseInt(req.query.page)
        if (page <= 0) {
            return res.json(response.failure(403, "Page must be greater than 0"));
        }
    }
    var skip = limit * (page - 1)
    var token = req.query.token;
    jwt.verify(token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        Locations
            .find({ saves: { $in: [decode._id] } })
            .select({ __v: 0, saves: 0 })
            .then(locations => {
                Locations
                    .count({ saves: { $in: [decode._id] } }, (err, count) => {
                        if (err) {
                            return res.json(response.failure(500, err.message))
                        }
                        var has_more_page = false;
                        if (skip + locations.length != count) {
                            has_more_page = true;
                        }
                        return res.json(response.successList({ locations: locations }, count, page, has_more_page))
                    })
            })
            .catch(error => {
                res.json(response.failure(500, error.message))
            })
    })
})

router.get("/:id", (req, res) => {
    if (!req.params.id) {
        return res.json(response.failure(404, "Not Found"));
    }
    var id = req.params.id;
    if (req.query.token) {
        jwt.verify(req.query.token, config.app_secret, (err, decode) => {
            if (err) {
                return res.json(response.failure(403, "You do not have permission"))
            }
            // console.log(decode)
            Locations
                .findOne({ _id: id })
                .select({ __v: 0 })
                .then(location => {
                    if (location) {
                        var newLocation = location.toObject();
                        newLocation.is_save = false;
                        if (location.saves.indexOf(decode._id) !== -1) {
                            console.log("TRUE")
                            newLocation.is_save = true;
                        }
                        delete newLocation.saves;
                        return res.json(response.success(newLocation))
                    } else {
                        return res.json(response.failure(403, "Can not find this location"))
                    }
                })
                .catch(error => {
                    return res.json(response.failure(500, error.message))
                })
        })
    } else {
        Locations
            .findOne({ _id: id })
            .select({ __v: 0, saves: 0 })
            .then(location => {
                if (location) {
                    var newLocation = location.toObject();
                    newLocation.is_save = false;
                    // console.log(JSON.stringify(newLocation))
                    return res.json(response.success(newLocation))
                } else {
                    return res.json(response.failure(403, "Can not find this location"))
                }
            })
            .catch(error => {
                return res.json(response.failure(500, error.message))
            })
    }
})

router.get("/:id/share", (req, res) => {
    if (!req.params.id) {
        return res.json(response.failure(404, "Not Found"));
    }
    var location_id = req.params.id;
    var api = "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=" + config.api_key;
    var api_info;
    Locations
        .findOne({ _id: location_id })
        .then(location => {
            api_info = {
                dynamicLinkInfo: {
                    dynamicLinkDomain: "n3ga2.app.goo.gl",
                    link: "https://" + config.server_domain + "/api/locations/" + location._id,
                    androidInfo: {
                        androidPackageName: "com.tlcn.mvpapplication"
                    },
                    socialMetaTagInfo: {
                        socialTitle: location.title,
                        socialDescription: location.title,
                        socialImageLink: "https://" + config.server_domain + location.lastest_image
                    }
                },
                suffix: {
                    option: "SHORT"
                }
            };
            var option = {
                method: "POST",
                json: true,
                url: api,
                header: {
                    "Content-Type": "application/json"
                },
                body: api_info
            };
            request(option, function (err, httpResponse, body) {
                return res.json(response.success({
                    share_link: body.shortLink
                }))
            });
        })
        .catch(error => {
            return res.json(response.failure(500, error.message))
        })
})

router.post("/contribute", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"));
    }
    if (!req.body.latitude || !req.body.longitude || !req.body.level || !req.body.file) {
        return res.json(response.failure(404, "Not Found"));
    }
    //req.body
    var token = req.query.token;
    var latitude = parseFloat(req.body.latitude);
    var longitude = parseFloat(req.body.longitude);
    var level = parseFloat((req.body.level / 20).toFixed(2));
    var file = req.body.file;
    var description = req.body.description || "";
    var created_at = new Date().toISOString();
    var point = {
        type: "Point",
        coordinates: [longitude, latitude]
    }
    jwt.verify(token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        if (decode) {
            const notification = req.admin.messaging();
            var userID = decode._id;
            User
                .findOne({ _id: userID })
                .then(user => {
                    if (!user) {
                        return res.json(response.failure(403, "You do not have permission"));
                    }
                    Locations
                        .count({}, (err, count) => {
                            if (err) {
                                return res.json(response.failure(500, err.message))
                            }
                            if (count != 0) {
                                Locations.aggregate(
                                    [
                                        {
                                            $geoNear: {
                                                near: point,
                                                spherical: true,
                                                distanceField: 'distance',
                                                maxDistance: 50
                                            }
                                        },
                                        {
                                            $lookup:
                                                {
                                                    from: "users",
                                                    localField: "saves",
                                                    foreignField: "_id",
                                                    as: "saves"
                                                }
                                        }
                                    ],
                                    function (err, locations) {
                                        // do what you want with the results here
                                        if (err) {
                                            console.log(err)
                                            return res.json(response.failure(500, err.message))
                                        }
                                        if (locations[0]) {
                                            var location = locations[0]
                                            var payload = {
                                                data: {
                                                    title: "Có vị trí kẹt xe mới",
                                                    messageBody: location.title,
                                                    location_id: location._id.toString()
                                                }
                                            };
                                            var tokens = []
                                            for (var i = 0; i < location.saves.length; i++) {
                                                // console.log(location.saves[i].fcm_token)
                                                if (location.saves[i].fcm_token) {
                                                    tokens.push(location.saves[i].fcm_token)
                                                }
                                            }
                                            console.log(location)
                                            var total_news = location.total_news + 1;
                                            var total_level = location.total_level + level;
                                            var average_rate = total_level / total_news;
                                            Locations
                                                .findOneAndUpdate({ _id: location._id }, {
                                                    total_news: total_news,
                                                    total_level: total_level,
                                                    average_rate: average_rate,
                                                    lastest_image: file,
                                                    status: true,
                                                    current_level: level,
                                                    last_modify: created_at
                                                }, { new: true })
                                                .then(location => {
                                                    let newNews = new News({
                                                        user_id: userID,
                                                        created_at: created_at,
                                                        level: level,
                                                        description: description,
                                                        url_image: file,
                                                        count_like: 0,
                                                        count_dislike: 0,
                                                        type: 1,
                                                        location_id: location._id,
                                                        likes: [],
                                                        dislikes: []
                                                    })
                                                    newNews
                                                        .save()
                                                        .then(news => {
                                                            utilities.onLocationChanged(req.socketIO, location)
                                                            if (tokens.length > 0) {
                                                                notification
                                                                    .sendToDevice(tokens, payload)
                                                                    .then(resp => {
                                                                        console.log(resp)
                                                                        return res.json(response.success({}))
                                                                    })
                                                                    .catch(error => {
                                                                        console.log(error.message)
                                                                        return res.json(response.success({}))
                                                                    })
                                                            } else {
                                                                return res.json(response.success({}))
                                                            }
                                                        })
                                                        .catch(error => {
                                                            return res.json(response.failure(500, error.message))
                                                        })
                                                })
                                        } else {
                                            geocoder
                                                .reverse({ lat: latitude, lon: longitude })
                                                .then(function (result) {
                                                    var title;
                                                    if (result[0].streetNubmer) {
                                                        title =
                                                            "Kẹt xe tại số " +
                                                            result[0].streetNumber +
                                                            ", " +
                                                            result[0].streetName +
                                                            ", " +
                                                            result[0].administrativeLevels.level2long;
                                                    } else {
                                                        title =
                                                            "Kẹt xe tại " +
                                                            result[0].streetName +
                                                            ", " +
                                                            result[0].administrativeLevels.level2long;
                                                    }
                                                    let newLocation = new Locations({
                                                        title: title,
                                                        location: point,
                                                        total_news: 1,
                                                        total_level: level,
                                                        stop_count: 0,
                                                        average_rate: level,
                                                        lastest_image: file,
                                                        status: true,
                                                        current_level: level,
                                                        last_modify: created_at,
                                                        saves: []
                                                    })
                                                    newLocation
                                                        .save()
                                                        .then(location => {
                                                            let newNews = new News({
                                                                user_id: userID,
                                                                created_at: created_at,
                                                                level: level,
                                                                description: description,
                                                                url_image: file,
                                                                count_like: 0,
                                                                count_dislike: 0,
                                                                location_id: location._id,
                                                                type: 1,
                                                                likes: [],
                                                                dislikes: []
                                                            })
                                                            newNews
                                                                .save()
                                                                .then(news => {
                                                                    utilities.onLocationChanged(req.socketIO, location)
                                                                    return res.json(response.success({}))
                                                                })
                                                                .catch(error => {
                                                                    return res.json(response.success({}))
                                                                })
                                                        })
                                                        .catch(error => {
                                                            return res.json(response.failure(500, error.message))
                                                        })
                                                })
                                                .catch(error => {
                                                    return res.json(response.failure(500, error.message))
                                                });
                                        }
                                    }
                                )
                            }
                            else {
                                geocoder
                                    .reverse({ lat: latitude, lon: longitude })
                                    .then(function (result) {
                                        var title;
                                        if (result[0].streetNubmer) {
                                            title =
                                                "Kẹt xe tại số " +
                                                result[0].streetNumber +
                                                ", " +
                                                result[0].streetName +
                                                ", " +
                                                result[0].administrativeLevels.level2long;
                                        } else {
                                            title =
                                                "Kẹt xe tại " +
                                                result[0].streetName +
                                                ", " +
                                                result[0].administrativeLevels.level2long;
                                        }
                                        let newLocation = new Locations({
                                            title: title,
                                            location: point,
                                            total_news: 1,
                                            total_level: level,
                                            stop_count: 0,
                                            average_rate: level,
                                            lastest_image: file,
                                            status: true,
                                            current_level: level,
                                            last_modify: created_at,
                                            saves: []
                                        })
                                        newLocation
                                            .save()
                                            .then(location => {
                                                let newNews = new News({
                                                    user_id: userID,
                                                    created_at: created_at,
                                                    level: level,
                                                    description: description,
                                                    url_image: file,
                                                    count_like: 0,
                                                    count_dislike: 0,
                                                    location_id: location._id,
                                                    type: 1,
                                                    likes: [],
                                                    dislikes: []
                                                })
                                                newNews
                                                    .save()
                                                    .then(news => {
                                                        utilities.onLocationChanged(req.socketIO, location)
                                                        return res.json(response.success({}))
                                                    })
                                                    .catch(error => {
                                                        return res.json(response.success({}))
                                                    })
                                            })
                                            .catch(error => {
                                                return res.json(response.failure(500, error.message))
                                            })
                                    })
                                    .catch(err => {
                                        return res.json(response.failure(500, err.message))
                                    });
                            }
                        })

                })
        }
    })
})

router.post("/save", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"))
    }
    if (!req.body.location_id) {
        return res.json(response.failure(403, "Missing parameters"));
    }
    var location_id = req.body.location_id;
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
                Locations
                    .findOne({ _id: location_id })
                    .then(location => {
                        if (!location) {
                            return res.json(response.failure(403, "Can not find this location"))
                        }
                        var saves = location.saves;
                        if (saves.indexOf(user_id) === -1) {
                            Locations
                                .findOneAndUpdate({ _id: location_id }, { $push: { saves: user_id } }, { new: true })
                                .then(newLocation => {
                                    var loc = newLocation.toObject();
                                    loc.is_save = true;
                                    delete loc.__v;
                                    delete loc.saves
                                    return res.json(response.success(loc))
                                })
                                .catch(error => {
                                    return res.json(response.failure(500, error.message))
                                })
                        }
                        else {
                            Locations
                                .findOneAndUpdate({ _id: location_id }, { $pull: { saves: user_id } }, { new: true })
                                .then(newLocation => {
                                    var loc = newLocation.toObject();
                                    loc.is_save = false;
                                    delete loc.__v;
                                    delete loc.saves
                                    return res.json(response.success(loc))
                                })
                                .catch(error => {
                                    return res.json(response.failure(500, error.message))
                                })
                        }
                    })
                    .catch(error => {
                        return res.json(response.failure(500, error.message))
                    })
            })

    })
})

router.put("/off", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"));
    }
    if (!req.body.location_id) {
        return res.json(response.failure(403, "Missing parameters"));
    }
    var id = req.body.location_id;
    var token = req.query.token;
    var updated_at = new Date().toISOString();
    jwt.verify(token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        User
            .findOne({ _id: decode._id })
            .then(user => {
                if (!user) {
                    return res.json(response.failure(403, "You do not have permission"));
                }
                Locations
                    .findOne({ _id: id })
                    .select({ __v: 0 })
                    .populate("saves")
                    .then(location => {
                        if (location.stop_count >= 2) {
                            Locations.findOneAndUpdate({ _id: id }, { status: false, last_modify: updated_at, stop_count: 0 }, { new: true })
                                .select({ __v: 0 })
                                .then(location => {
                                    utilities.onLocationChanged(req.socketIO, location)
                                    return res.json(response.success({}))
                                })
                                .catch(error => {
                                    return res.json(response.failure(500, error.message))
                                })
                        } else {
                            Locations.findOneAndUpdate({ _id: id }, { last_modify: updated_at, $inc: { stop_count: 1 } }, { new: true })
                                .then(location => {
                                    return res.json(response.success({}))
                                })
                                .catch(error => {
                                    return res.json(response.failure(500, error.message))
                                })
                        }
                    })
                    .catch(error => {
                        return res.json(response.failure(500, error.message))
                    })
            })
    })
})

router.put("/on", (req, res) => {
    if (!req.query.token) {
        return res.json(response.failure(403, "You do not have permission"));
    }
    if (!req.body.location_id) {
        return res.json(response.failure(403, "Missing parameters"));
    }
    var id = req.body.location_id;
    var token = req.query.token;
    var updated_at = new Date().toISOString();
    jwt.verify(token, config.app_secret, (err, decode) => {
        if (err) {
            return res.json(response.failure(403, "You do not have permission"));
        }
        User
            .findOne({ _id: decode._id })
            .then(user => {
                if (!user) {
                    return res.json(response.failure(403, "You do not have permission"));
                }
                Locations
                    .findOneAndUpdate({ _id: id }, { status: true, last_modify: updated_at, stop_count: 0 }, { new: true })
                    .populate({
                        path: "saves",
                        select: "fcm_token"
                    })
                    .select({ __v: 0 })
                    .then(location => {
                        utilities.onLocationChanged(req.socketIO, location)
                        const notification = req.admin.messaging()
                        var payload = {
                            data: {
                                title: "Có vị trí kẹt xe mới",
                                messageBody: location.title,
                                location_id: location._id.toString()
                            }
                        };
                        var tokens = []
                        for (var i = 0; i < location.saves.length; i++) {
                            // console.log(location.saves[i].fcm_token)
                            if (location.saves[i].fcm_token) {
                                tokens.push(location.saves[i].fcm_token)
                            }
                        }
                        notification
                            .sendToDevice(tokens, payload)
                            .then(resp => {
                                console.log(resp)
                                return res.json(response.success({}))
                            })
                            .catch(error => {
                                console.log(error)
                                return res.json(response.success({}))
                            })
                    })
                    .catch(error => {
                        return res.json(response.failure(500, error.message))
                    })
            })
    })
})

module.exports = router;
