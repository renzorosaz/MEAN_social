'use strict'

var express = require('express');

var PublicationController = require('../controllers/publication');

var api = express.Router();

var md_auth = require('../middlewares/authenticated');

var crypto = require('crypto');
var multer = require('multer');

//var multipart =require('connect-multiparty');

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, './uploads/publications');
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

var mul_upload = multer({ dest: './uploads/publications', storage });

api.get('/probando-pub',md_auth.ensureAuth,PublicationController.probando);
api.post('/publication',md_auth.ensureAuth,PublicationController.savePublication);

module.exports = api;