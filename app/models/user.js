var db = require('../config');
var bcrypt = require('bcrypt');

var User = db.Model.extend({
});

module.exports = User;
