const mongoose = require("mongoose");

const LocationsSchema = new mongoose.Schema({
    title: String,
    latitude: Number,
    longitude: Number,
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

module.exports = mongoose.model("Locations", LocationsSchema);