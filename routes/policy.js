var express = require("express");
var router = express.Router();

var router = express.Router();

router.get('/private', (req, res) => {
    return res.render("private");
})

module.exports = router;
