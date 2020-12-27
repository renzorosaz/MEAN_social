'use strict'

var express = require('express');
var UserController = require('../controllers/user');

var api = express.Router();
var md_auth = require('../middlewares/authenticated');
var crypto = require('crypto');
var multer = require('multer');

//var multipart =require('connect-multiparty');

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, './uploads/users');
    },

    filename(req, file = {}, cb) {

        const { originalname } = file;

        const fileExtension = (originalname.match(/\.+[\S]+$/) || [])[0];

        // cb(null, `${file.fieldname}__${Date.now()}${fileExtension}`);

        crypto.pseudoRandomBytes(16, function (err, raw) {

            cb(null, raw.toString('hex') + Date.now() + fileExtension);

        });

    },

});

var mul_upload = multer({ dest: './uploads/users', storage });

//var md_upload = multer({uploadDir: './uploads/users'});

api.get('/home', UserController.home);
api.get('/pruebas', md_auth.ensureAuth, UserController.pruebas);
api.post('/register', UserController.saveUser);
api.post('/login', UserController.loginUser);
api.get('/user/:id', md_auth.ensureAuth, UserController.getUser);
api.get('/users/:page?', md_auth.ensureAuth, UserController.getUsers);
api.get('/counters/:id?',md_auth.ensureAuth,UserController.getCounters);
api.put('/update-user/:id', md_auth.ensureAuth, UserController.updateUser);
//api.post('/upload-image-user/:id',[md_auth.ensureAuth,mul_upload],UserController.uploadImage);
api.post('/upload-image-user/:id', [md_auth.ensureAuth, mul_upload.single('image')], UserController.uploadImage);
api.get('/get-image-user/:imageFile', md_auth.ensureAuth, UserController.getImageFIle); 


module.exports = api;
