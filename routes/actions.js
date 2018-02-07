var express = require("express");
var admin = require("firebase-admin");
var jwt = require("jsonwebtoken");

var response = require('../util/response')
var config = require('../config')

var Locations = require("../models/Locations");

var router = express.Router();

module.exports = router;
