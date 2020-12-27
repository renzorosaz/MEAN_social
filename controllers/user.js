'use strict'
var bcrypt = require('bcrypt-nodejs');

var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');
var path = require('path');

var Follow = require('../models/follow');
var User = require('../models/user');
var jwt = require('../services/jwt');


//Meetodos de prueba
function home(req, res) {
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJS'
    });
}

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJS'
    });
}

//Registro de usuario
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

//Login de Usuario
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

//COnseguir datos de un usuario

function getUser(req, res) {
    var userId = req.params.id;


    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: "Error en la petición" });

        if (!user) return res.status(404).send({ message: "EL usuario no existe" });


        followThisUser(req.user.sub, userId).then((value) => {
            user.password = undefined;

            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            })
        });

    });
}

async function followThisUser(identity_user_id, user_id) {
    var following = await Follow.findOne({ user: identity_user_id, followed: user_id }).exec()
        .then((following) => {
            return following;
        })
        .catch((err) => {
            return handleError(err);
        });
    var followed = await Follow.findOne({ user: user_id, followed: identity_user_id }).exec()
        .then((followed) => {
            return followed;
        })
        .catch((err) => {
            return handleError(err);
        });

    return {
        following: following,
        followed: followed
    };
}

//Devolver un listado de usuarios paginado
function getUsers(req, res) {
    var identity_user_id = req.user.sub;

    var page = 1;
    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {

        if (err) return res.status(500).send({ message: "Error en la petición" });
        if (!users) return res.status(400).send({ message: "No hay usuarios dispnibles" });

        followUserIds(identity_user_id).then((value) => {

            return res.status(200).send({
                users,
                users_following: value.following,
                user_follow_me: value.followed,
                total,
                pages: Math.ceil(total / itemsPerPage)
            });


        });


    });
}

async function followUserIds(user_id) {

    var following = await Follow.find({ "user": user_id }).select({ '_id': 0, '__v': 0, 'user': 0 }).exec((err, follows) => {
        var following_clean = [];



        following.forEach((follow) => {
            following_clean.push(follow.followed);
        });

        return following_clean;
    });


    var followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '__v': 0, 'followed': 0 }).exec((err, follows) => {
        var followed_clean = [];

        console.log(err);
        console.log(following);

        followed.forEach((follow) => {
            followed_clean.push(follow.followed);
        });

        console.log(followed);

        return following_clean;
    });

    //Procesar followings ids


    //Procesar followed ids

    return {
        following: following_clean,
        followed: followed_clean,
    }
}

function getCounters(req, res) {
    var userId = req.user.sub;

    if (req.params.id) {
        userId = req.params.id;
    }

    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    });

}

async function getCountFollow(user_id) {

    var following = await Follow.count({ "user": user_id }).exec((err, count) => {
        if (err) return handleError(err);
        return count;

    });

    var followed = await Follow.count({ "followed": user_id }).exec((err, count) => {
        if (err) return handleError(err);
        return count;
    });

    return {

        following: following,
        followed: followed
    }
}

//Edición de datos de usuario
function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    //borrar la propiedad password

    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({ message: "No tienes permiso para actualizar los datos del usuarios" });
    }

    User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
        if (err) return res.status(500).send({ message: "Error en la petición" });

        if (!userUpdated) return res.status(404).send({ message: "No se ha podido actualizar el usuario" });

        return res.status(200).send({ user: userUpdated });
    });
}

//Subir archivo de imagen //avatar de usuario


function uploadImage(req, res) {
    var userId = req.params.id;


    if (req.file) {
        console.log(req.file);

        var file_path = file.image.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = fil.name.split('\.');
        var file_ext = ext_split[1]

        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permisos para actualizar los datos del usuario');

        }

        if (file_ext == 'png' || file_ext == 'gif' || file_ext == 'jpg' || file_ext == 'jpeg') {

            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: "Error en la petición" });
                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

                return res.status(200).send({ user: userUpdated });

            })

        } else {
            return removeFilesOfUploads(res, file_path, 'Extension no valida');
        }

        console.log(file_path);

    } else {

        res.status(200).send({ message: 'No has subido ninguna imagen..' });

    }

}

function removeFilesOfUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: message });
    });
}

function getImageFIle(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: "No existe la imagen..." })
        }
    });
}


module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFIle
}

