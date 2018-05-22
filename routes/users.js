var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var crypto = require('crypto');
var nodemailer = require('nodemailer');

var User = require('../models/user');
var Token = require('../models/token');

// Register
router.get('/register', function (req, res) {
	res.render('register');
});

// Login
router.get('/login', function (req, res) {
	if(res.locals.error == 'Your account has not been verified. Check your mailbox for verification email.'){
		res.render('login', {resend: 'Resend needed!'});
	}
	else{
		res.render('login');
	}
});

// Register User
router.post('/register', function (req, res) {
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();
	
	if (errors) {
		res.render('register', { errors: errors });
	}
	else {
		//checking for email and username are already taken
		User.findOne(
			{ username: { "$regex": "^" + username + "\\b", "$options": "i" } },
			function (err, user) {
				User.findOne(
					{ email: { "$regex": "^" + email + "\\b", "$options": "i" } },
					function (err, mail) {
						if (user || mail) {
							res.render('register', { user: user, mail: mail });
						}
						else {
							var newUser = new User({
								name: name,
								email: email,
								username: username,
								password: password
							});
							User.createUser(newUser, function (err, user) {
								if (err) throw err;
								console.log(user);
								// Create a verification token for this user
								var token = new Token({
									_userId: user._id,
									token: crypto.randomBytes(16).toString('hex')
								});
								token.save(function (err) {
									if (err) { return res.status(500).send({ msg: err.message }); }
									console.log('token saved:' + token);
									// Send the email with token
									// setup smtp transporter
									let transporter = nodemailer.createTransport({
										service: email_provider,
										port: 587,
										secure: false,
										auth: { 
											user: email_account, 
											pass: email_password
										}
									});
									console.log('request headers :'+req.headers.host)
									let mailOptions = {
										from: email_account,
										to: user.email,
										subject: 'Account Verification Token',
										text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/users\/verify\/' + token._id + '.\n'
									};

									transporter.sendMail(mailOptions, function (err) {
										if (err) throw err;
										console.log('Email Sent !');
									});
								});
							});
							
							req.flash('success_msg', 'You are registered, check your mailbox for verification email.');
							res.redirect('/users/login');
						}
					}
				);
			}
		);
	}
});

passport.use(new LocalStrategy(
	function (username, password, done) {
		User.getUserByUsername(username, function (err, user) {
			if (err) throw err;
			if (!user) {
				return done(null, false, { message: 'Unknown User' });
			}
			User.comparePassword(password, user.password, function (err, isMatch) {
				if (err) throw err;
				if (isMatch) {
					if (!user.isVerify) {
						return done(null, false, { message: 'Your account has not been verified. Check your mailbox for verification email.' });
					}
					else{
						return done(null, user);
					}
				} else {
					return done(null, false, { message: 'Invalid password' });
				}
			});
		});
	}));

passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	User.getUserById(id, function (err, user) {
		done(err, user);
	});
});

router.post('/login',
	passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/login', failureFlash: true }),
	function (req, res) {
		res.redirect('/');
	});

router.get('/logout', function (req, res) {
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/users/login');
});

router.get('/verify/:id', function (req, res) {
	console.log('route get: '+ req.params.id);
	Token.findById(req.params.id, function (err, Token) {
		// if token found update to verified user
		if(Token){
			var newValue = {$set:{isVerify:true}};
			User.findByIdAndUpdate(Token._userId, newValue, function (err, theUser){
				console.log(theUser);
				res.render('verify', {msg : 'Thank you for your submission. Redirect to login page in 3sec !'});
			});
		}
		else{
			res.redirect('/users/verifyResend');
		}
		// if not found go to resend page with error message
	});
});

router.get('/verifyResend', function(req, res){
	res.render('verifyResend');
});

router.post('/verifyResend', function(req, res){
	var email = req.body.email;
	var password = req.body.password;

	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('password', 'Password is required').notEmpty();

	var errors = req.validationErrors();

	if (errors) {
		res.render('verifyResend', { errors: errors });
	}
	else{
		User.getUserByEmail(email, function (err, user) {
			if (err) throw err;
			// if user not found
			if (!user) {				
				res.render('verifyResend', {errmsg: 'Unregistered Email !'});
			}
			// if user found
			else{
				User.comparePassword(password, user.password, function (err, isMatch) {
					if (err) throw err;
					// if password matched
					if (isMatch) {
						// if user already verified
						if (user.isVerify) {
							res.render('verifyResend', {errmsg: 'User Already Verified !'});
						}
						// if registered but not verified then resend token
						else{
							console.log(user);
							// Create a verification token for this user
							var token = new Token({
								_userId: user._id,
								token: crypto.randomBytes(16).toString('hex')
							});
							token.save(function (err) {
								if (err) { return res.status(500).send({ msg: err.message }); }
								console.log('token saved:' + token);
								// Send the email with token
								// setup smtp transporter
								let transporter = nodemailer.createTransport({
									service: email_provider,
									port: 587,
									secure: false,
									auth: { 
										user: email_account, 
										pass: email_password
									}
								});
								console.log('request headers :'+req.headers.host)
								let mailOptions = {
									from: email_account,
									to: user.email,
									subject: 'Account Verification Token',
									text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/users\/verify\/' + token._id + '.\n'
								};

								transporter.sendMail(mailOptions, function (err) {
									if (err) throw err;
									console.log('Email Sent !');
								});
							});
							res.render('verifyResend', {successmsg: 'Verification Email Resend ! Please Check Your Mailbox !'});
						}
					}
					// if password not matched 
					else {
						res.render('verifyResend', { msg: 'Invalid password' });
					}
				});
			}
		});
	}
});

module.exports = router;
