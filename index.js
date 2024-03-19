// Import Dependencies
const express = require('express');
const session = require('express-session');
const path = require('path');
var juiceShopBlog = express();

// Setup Database Connection
const mongoose = require('mongoose');
const { MongoClient, Double } = require('mongodb');
mongoose.connect('mongodb://localhost:27017/juiceshop', {
    UseNewUrlParser: true,
    UseUnifiedTopology: true
});


// Setup Database Model
const Order = mongoose.model('Orders', {
    studentid: String,
    studentname: String,
    mjuice: Number,
    bjuice: Number,
    ajuice: Number,
    subtotal: Number,
    tax: Number,
    total: Number
});

//Setup Admin Database Model
const Admin = mongoose.model('Admin', {
    aname: String,
    pass: String

});

// Create Object Destructuring For Express Validator
const { check, validationResult } = require('express-validator');
const { stringify } = require('querystring');

// Express Body-Parser
juiceShopBlog.use(express.urlencoded({ extended: true }));
//session
juiceShopBlog.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}))

// Set Path to public and views forlder
juiceShopBlog.set('views', path.join(__dirname, 'views'));
juiceShopBlog.use(express.static(__dirname + '/public'));
juiceShopBlog.set('view engine', 'ejs');


// Root Page Get Method (First time page load)
juiceShopBlog.get('/', function (req, res) {
    res.render('orderForm');
});

juiceShopBlog.get('/orderConfirm', function (req, res) {
    res.render('orderConfirm',);
});

//Global Variables
let total = 0;
let juice = {
    name: String,
    price: Number,
    quantity: Number,
    total: Number
}
let orderDB={};
function customProductsValidation(quantity, { req }) {
    let selectedProducts = req.body.quantity;
    console.log("request body " + req.body.quantity);
    console.log("selected products " + req.body.quantity.length);
    total = 0;

    var mjuice = 0;
    var ajuice = 0;
    var bjuice = 0;
    var subtotal = 0;
    var tax = 0;
    for (let i = 0; i < req.body.quantity.length; i++) {
        console.log(req.body.quantity[i]);
        if (req.body.quantity[i] != '' && req.body.quantity[i] > 0) {
            let juice = getPriceByQuantity(i);
            if (i == 0) {
                mjuice = req.body.quantity[i] * juice.price;
            }
            else if (i == 1) {
                bjuice = req.body.quantity[i] * juice.price;
            }
            else if (i == 2) {
                ajuice = req.body.quantity[i] * juice.price;
            }

            total += req.body.quantity[i] * juice.price;

            console.log("Juice:" + juice);
        }

    }
    //console.log("Juices:" + juices);
    console.log(total);
    if (total <= 0) {
        console.log(total);
        throw new Error("Please select atleast one juice");
    } else {
        var orderData = {
            studentname: req.body.name,
            studentid: req.body.studentId,
            mjuice: mjuice,
            bjuice: bjuice,
            ajuice: ajuice,
            subtotal: total,
            tax: total*0.13,
            total: subtotal+tax
        }
        orderDB = orderData;
       // order = new Order(order);
        console.log("Order Form:"+{orderDB});
        return true;
    }
   
}

function getPriceByQuantity(index) {
    console.log(index);
    let juice = {};
    switch (index) {
        case 0:
            juice.name = "MangoJuice";
            juice.price = 6.99;

            break;
        case 1: juice.name = "BerryJuice";
            juice.price = 5.99;

            break;
        case 2:
            juice.name = "AppleJuice";
            juice.price = 3.99;

            break;

    }
    console.log(juice);
    return juice;
}
// Root Page Post Method (Server Response)
juiceShopBlog.post('/', [
    check('name', 'Name is required').notEmpty(),
    check('studentId', 'Student Id is required').custom(customStudentIdValidation),
    check('quantity', '').custom(customProductsValidation),
], function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
        res.render('orderForm', { errors: errors.array() });

    } else {
        console.log("Order Post:"+orderDB);
        console.log("bjuics:"+orderDB.bjuice);
        res.render('orderConfirm', orderDB);
    }
});

juiceShopBlog.post('/orderConfirm', function (req, res) {
    console.log("OrderData for DB:"+orderDB);
    var order = new Order(orderDB);
    order.save().then(function () {
        console.log("Order Saved Successfully !");
        res.render('formMessage', { message: "Order Added Successfully!" });
    });


});


//Validations
function customStudentIdValidation(input) {
    var studentIdRegex = /^\d{3}-\d{4}$/;
    if (input == '') {
        throw new Error('Student ID is required');
    }
    if (!validateRegex(input, studentIdRegex)) {
        throw new Error('Please enter valid student Id');
    } else
        return true;
}
function customJuiceValidation(input) {
    console.log(input);
    if (input == undefined) {
        throw new Error('Select Atleast one juice');
    }
    else
        return true;
}
function validateRegex(input, regEx) {
    if (regEx.test(input)) {
        return true;
    } else
        return false;

}


// Logout Page
juiceShopBlog.get('/logout', (req, res) => {
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('login', { error: "Logout Successfully! " });
});


// All  Page
juiceShopBlog.get('/allOrders', (req, res) => {
    // If Session Exists, Then Access All  Page
    if (req.session.userLoggedIn) {
        Order.find({}).then((orders) => {
            console.log(`orders: ${orders}`);
            res.render('allOrders', {orders: orders });
        }).catch(function (err) {
            console.log(`Error: ${err}`);
        });
    }
    else {
        // Otherwise Redirect User To Login Page
        res.redirect('/login');
    }
});



// Login Page
juiceShopBlog.get('/login', (req, res) => {
    res.render('login');
});

// Post Login Page
juiceShopBlog.post('/login', [
    check('userName', 'User Name is required!').notEmpty(),
    check('password', 'Password is required!').notEmpty(),
], (req, res) => {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
        // Display Error Messages
        res.render('login', { errors: errors.array() });
    } else {
        console.log(req.body);
        var userName = req.body.userName;
        var password = req.body.password;
        console.log(`userName=${userName} and password: ${password}`);
        //Validate against DB
        Admin.findOne({ aname: userName, pass: password }).then((admin) => {
            console.log(`Admin result from db: ${admin}`);
            if (admin) {
                req.session.username = admin.username;
                req.session.userLoggedIn = true;
                res.redirect('/allorders');
            } else {
                res.render('login', { errors: "Sorry Login Failed. Please Try Again!" });
                console.log(errors);
            }

        }).catch((err) => {
            console.log(`Error: ${err}`);
        })
    }
});





// Delete Page - Get Method
juiceShopBlog.get('/delete/:_id', (req, res) => {
    if (req.session.userLoggedIn) {
        var id = req.params._id;
        Order.findByIdAndDelete({ _id: id }).then((order) => {
            console.log(`page : ${order}`);
            if (order) {
                res.render('deleteMessage', { message: "Page Deleted Successfully!" });
            }
            else {
                res.render('deleteMessage', { message: "Something Went Wrong. page Not Deleted!" });
            }
        }).catch(function (err) {
            console.log(`Error: ${err}`);
        });
    }
    else {
        // Otherwise Redirect User To Login Page
        res.redirect('/login');
    }
});

// Execute Website Using Port Number for Localhost
juiceShopBlog.listen(8080);
console.log('Website Executed Sucessfully....Open Using http://localhost:8080/');