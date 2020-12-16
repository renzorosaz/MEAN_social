'use strict'
var bcrypt = require('bcrypt-nodejs');

var User = require('../models/user');

var jwt= require('../services/jwt');


function home(req, res) {
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJS'
    });
};

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJS'
    });
}

function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //Comprobar usuarios duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: "Error en la petición de usuarios" });

            if (users && users.length >= 1) {
                return res.status(200).send({ message: "EL usuario que intentas registrar ya existe" });
            } else {
                //Cifra contraseña de usuario
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: "Error al guardar el usuario" });

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status().send({ message: "No se ha registrado el usuario" });
                        }
                    });
                });
            }
        });


    } else {
        res.status(200).send({
            message: "Envia todos los campos necesarios!!"
        });
    }
}

function loginUser(req, res) {
    var params = req.body;
    var email = params.email;
    var password = params.password;

    User.findOne({ email: email }, (err, user) => {

        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {

                    if (params.gettoken) {
                        //devolver token
                        //generar el token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    } else {
                        user.password = undefined;
                        return res.status(200).send({ user })
                    }


                }
                else {
                    if (err) return res.status(400).send({ message: 'El usuario no se ha podido identificar' });
                }
            });
        } else {
            if (err) return res.status(400).send({ message: 'El usuario no se ha podido identificar' });
        }
    });
}

module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser
}