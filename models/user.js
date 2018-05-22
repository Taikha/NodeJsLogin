var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

// User Schema
var UserSchema = mongoose.Schema({
	username: { type: String, index: true },
	password: { type: String },
	email: { type: String, unique: true },
	name: { type: String },
	isVerify:{ type: Boolean, default: false },
	image: { type: String, default: '' }
});

var User = exports = mongoose.model('User', UserSchema);

exports.createUser = function(newUser, callback){
	bcrypt.genSalt(10, function(err, salt) {
	    bcrypt.hash(newUser.password, salt, function(err, hash) {
	        newUser.password = hash;
	        newUser.save(callback);
	    });
	});
}

exports.updateImage = function(username, newImage, callback){
	var query = {username: username};
	var newValue = {$set:{image: newImage}};
	User.updateOne(query, newValue, function(err, raw){
		if(err) throw err;
    	callback(null, "Record Updated !");
	});
}

exports.loadImage = function(username, callback){
	var query = {username: username};
	User.findOne(query, function(err, res){
		if(err) throw err;
    	callback(null, res.image);
	});
}

exports.getUserByUsername = function(username, callback){
	var query = {username: username};
	User.findOne(query, callback);
}

exports.getUserByEmail = function(email, callback){
	var query = {email: email};
	User.findOne(query, callback);
}

exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

exports.updateVerify = function(username, callback){
	var query = {username: username};
	var newValue = {$set:{isVerify: true}};
	User.updateOne(query, newValue, function(err, raw){
		if(err) throw err;
		callback(null, "Record Updated !");
	});
}

exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	if(err) throw err;
    	callback(null, isMatch);
	});
}
