const express = require('express');
const jwt = require('jsonwebtoken');
const { promisify } = require("util");
const Signup = require('../models/signup');
const { requireSignin } = require('../middleware');
require("dotenv").config(`../../.env`); // Ensure this is at the top of the file

const router = express.Router(); // Ensure router is defined here

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '1h';
const NODE_ENV = process.env.NODE_ENV;

const signJwt = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES
    });
};

const sendToken = (user, statuscode, req, res) => {
    const token = signJwt(user._id);
    res.cookie("jwt", token, {
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        secure: NODE_ENV === 'production',
        httpOnly: NODE_ENV === 'production'
    });
    console.log("Inside send token");
    res.status(statuscode).json({
        token,
        user
    });
};


const signout = (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({
        message: "Signed out successfully!"
    });
};

const decryptJwt = async (token) => {
    const jwtverify = promisify(jwt.verify);
    return await jwtverify(token, JWT_SECRET);
};

const secure = async (req, res, next) => {
    let token;
    if (req.cookies) token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({
            status: "unauthorized",
            message: "You are not authorized to view the content"
        });
    }
    const jwtInfo = await decryptJwt(token);
    console.log(jwtInfo);
    const user = await Signup.findById(jwtInfo.id);
    req.user = user;
    next();
};

const checkField = (req, res, next) => {
    const { email, password, cpassword } = req.body;
    if (!email || !password || !cpassword) {
        console.log('Please enter all the fields');
        return res.status(400).send('Please enter all the fields');
    }
    next();
};

const checkFieldLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        console.log('Please enter all the fields');
        return res.status(400).send('Please enter all the fields');
    }
    next();
};

const checkUsername = (req, res, next) => {
    const { email } = req.body;
    Signup.findOne({ email: email }).exec((err, data) => {
        if (err) throw err;
        if (data) {
            console.log('Email Exists');
            return res.status(400).send('Email already exists');
        }
        next();
    });
};

const checkPassword = (req, res, next) => {
    const { password, cpassword } = req.body;
    if (password !== cpassword) {
        console.log('Password did not match');
        return res.status(400).send('Password did not match');
    }
    next();
};

router.get('/', (req, res) => res.send("This is Home page !!"));

router.post('/signup', checkField, checkUsername, checkPassword, async (req, res) => {
    console.log("Signup :", req.body);
    const { firstname, lastname, email, number, password } = req.body;
    try {
        const newSignup = await Signup.create({
            firstname,
            lastname,
            email,
            number,
            password
        });
        console.log(newSignup);
        res.send("Done");
    } catch (err) {
        res.status(401).json(err.message);
    }
});

router.post('/login', checkFieldLogin, async (req, res) => {
    console.log('Login :', req.body);
    const { email, password } = req.body;

    try {
        const user = await Signup.findOne({ email: email }).exec();

        if (!user) {
            console.log('Not exist');
            return res.status(404).send("Email does not exist");
        }

        if (user.password === password) {
            console.log("Logging in");
            sendToken(user, 200, req, res);
            console.log("Login successful");
        } else {
            console.log('Please check again!');
            res.status(400).send("Password Incorrect");
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send("Server Error");
    }
});

router.post('/checktoken', requireSignin, (req, res) => {
    res.status(200).json({});
});

router.post('/signout', requireSignin, signout);

router.post('/feed', requireSignin, (req, res) => res.status(200).json({
    message: "Working fine"
}));

router.post('/sendmessage', (req, res) => {
    console.log(req.body);
    const { name, email, message } = req.body;
    // Implement an alternative mail sending solution here
    res.status(200).json({ success: true });
});

module.exports = router;
