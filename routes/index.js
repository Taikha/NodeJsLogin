const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
var path = require('path');


const storage = multer.diskStorage({
	destination: 'public/uploads',
	filename: function(req, file, cb){
		cb(null, Date.now() +"_"+ file.originalname);
	}
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png'){
		cb(null, true);
	}
	else{
		cb('Error ! Images Only !');
	}
};

// limit to 5mb
const upload = multer({
	storage: storage,
	limits: {fileSize: 1024 * 1024 * 5},
	fileFilter: fileFilter
}).single('imageUpload');

var User = require('models/user');

// 1. Get Homepage if authenticated, else go to login page
// 2. Load profile image if any
router.get('/', ensureAuthenticated,(req, res) => {
	if(req.user.username){
		User.loadImage(req.user.username, function (err, image){
			if (err) throw err;
			else{
				fs.exists('public/'+image, function(exists){
					if(exists && (image != '')){
						res.render('index', {
							imgURL: image
						});
					}
					else{
						res.render('index');
					}
				});
			}
		});
	}
	else{
		res.render('index');
	}
	
});

// if submitted upload to folder and update user data
router.post('/upload', (req, res) => {
	upload(req, res, (err) => {
			//when wrong file submitted
		if(err){
			User.loadImage(req.user.username, function (err, image){
				if (image != undefined){
					fs.exists('public/'+image, function(exists){
						if(exists && (image != '')){
							res.render('index', {
								msg: 'Error ! Images Only !',
								imgURL: image
							});
						}
						else{
							res.render('index', {
								msg: 'Error ! Images Only !'
							});
						}
					});
				}
			});
		}
		else{
			// when there is nothing submited
			if(req.file == undefined){
				User.loadImage(req.user.username, function (err, image){
					if (err) throw err;
					if (image != undefined){
						fs.exists('public/'+image, function(exists){
							if(exists && (image != '')){
								res.render('index', {
									msg: 'Error: No File Selected!',
									imgURL: image
								});
							}
							else{
								res.render('index', {
									msg: 'Error: No File Selected!'
								});
							}
						});
					}
				});
			}
			// when file submited is ok
			else{
				// remove previous image
				User.loadImage(req.user.username, function (err, image){
					console.log(image);
					if (image != undefined){
						fs.exists('public/'+image, function(exists){
							if(exists && (image != '')){
								console.log('public/'+image + ' Found !')
								fs.unlink('public/'+image, function(err){
									if (err) throw err;
									console.log('File Deleted !');
								})
							}
							else{
								console.log('public/'+image + ' Not Found !')
							}
						});
					}
				});
				User.updateImage(req.user.username, `uploads/${req.file.filename}`,function (err, user) {
					if (err) throw err;
					console.log(user);
				});
				res.render('index', {
					successmsg: 'File Uploaded!',
					imgURL: `uploads/${req.file.filename}`
				});
			}
		}
	});
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/users/login');
	}
}

module.exports = router;