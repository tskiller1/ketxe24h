const mongoose = require("mongoose");
var GeoJSON = require('mongoose-geojson-schema');

// const LocationsSchema = new mongoose.Schema({
//     title: String,
//     latitude: Number,
//     longitude: Number,
//     total_level: Number,
//     total_news: Number,
//     stop_count: Number,
//     average_rate: Number,
//     lastest_image: String,
//     status: Boolean,
//     current_level: Number,
//     last_modify: String,
//     saves: [
//         {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User"
//         }
//     ]
// });
const LocationsSchema = new mongoose.Schema({
    title: String,
    location: mongoose.Schema.Types.Point,
    total_level: Number,
    total_news: Number,
    stop_count: Number,
    average_rate: Number,
    lastest_image: String,
    status: Boolean,
    current_level: Number,
    last_modify: String,
    saves: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});
LocationsSchema.index({location: '2dsphere'});
module.exports = mongoose.model("Locations", LocationsSchema);