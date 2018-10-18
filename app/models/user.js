var db = require('../config');
var bcrypt = require('bcrypt');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  default: {
    username: '',
    password: ''
  },
  initialize: function () {
    this.on('creating', function (model, attrs, options) {
      var password = this.get('password');
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);
      model.set('password', hash);
    });
  }
});

module.exports = User;
