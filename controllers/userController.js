const User = require('../models/user');
const Hotel = require('../models/hotel');
const Order = require('../models/order');
const Passport = require('passport');
const querystring = require('querystring');

// Express validator
const { check, validationResult }= require('express-validator/check');
const { sanitize }= require('express-validator/filter');



exports.signUpGet = (req, res) => {
    res.render('sign_up', {title: 'user sign up'});
}

exports.signUpPost = [
    // Validate data
    check('first_name').isLength({ min: 1 }).withMessage('First name must be specified')
    .isAlphanumeric().withMessage('First name must be alphanumeric'),

    check('surname').isLength({ min: 1 }).withMessage('Surname must be specified')
    .isAlphanumeric().withMessage('Surname must be alphanumeric'),

    check('email').isEmail().withMessage('Invalid email address'),

    check('confirm_email')
    .custom((value, { req }) => value === req.body.email)
    .withMessage('Email addresses do not match!'),

    check('password').isLength({ min: 6 }).withMessage('Passwords must be at least 6 chars!'),

    check('confirm_password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match!'),

    sanitize('*').trim().escape(),

    (req, res, next) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            res.render('sign_up', { title: 'Please fix the following errors: ', errors: errors.array()});
            return;
        }else{
            const newUser = new User(req.body);
            User.register(newUser, req.body.password, (err) => {
                if(err){
                    console.log('err while registering!', err);
                    return next(err);
                }
                next();
            });
        }
    }
]

exports.loginGet = (req, res) => {
    res.render('login', {title: 'login to continue'});
}

exports.loginPost = Passport.authenticate('local', {
    successRedirect: '/',
    successFlash: 'You are now logged in',
    failureRedirect: '/login',
    failureFlash: 'Login failed, please try again'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('info', 'You are now logged out');
    res.redirect('/');
}

exports.isAdmin = (req, res, next) => {
    if(req.isAuthenticated() && req.user.isAdmin){
        next();
        return;
    }
    res.redirect('/');
}

exports.orderPlaced = async(req, res, next) => {
    try{
        const data = req.params.data;
        const parsedData = querystring.parse(data);
        const order = new Order({
            user_id: req.user._id,
            hotel_id: parsedData.id,
            order_details: {
                duration: parsedData.duration,
                dateOfDeparture: parsedData.dateOfDeparture,
                numberOfGuests: parsedData.numberOfGuests
            }
        });
        await order.save();
        req.flash('info', 'Thank you, your order has been placed!');
        res.redirect('/my-account');
    } catch(err){
        next(err);
    }
}

exports.myAccounts = async (req, res, next) => {
    try{
        const orders = await Order.aggregate([
            {$match: {user_id : req.user.id} },
            {$lookup: {
                from: "hotels",
                localField: "hotel_id",
                foreignField: "_id",
                as: "hotel_data"
            }}
        ]    
        )
        res.render('user_account', {title: 'My account', orders});
    } catch(error){
        next(error);
    }
}

exports.allOrders = async (req, res, next) => {
    try{
        const orders = await Order.aggregate([
            {$lookup: {
                from: "hotels",
                localField: "hotel_id",
                foreignField: "_id",
                as: "hotel_data"
            }}
        ]    
        )
        res.render('orders', {title: 'All Orders', orders});
    } catch(error){
        next(error);
    }
}

exports.bookingConfirmation = async(req, res, next) => {
    try{
        const data = req.params.data;
        const searchData = querystring.parse(data);
        console.log(searchData);
        const hotel = await Hotel.find({ _id: searchData.id});
        res.render('confirmation', {title: 'Confirm your booking', hotel, searchData});
    }catch(error){
        next(error)
    }
}