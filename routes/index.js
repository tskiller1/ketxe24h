var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  return res.json({ message: "Chào mừng bạn đến với Kẹt Xe 24H" })
});

module.exports = router;
