/**
 * Created by Tomás on 24-03-2018.
 */
'use strict';
//modulos
const bcrypt = require('bcrypt-nodejs');
//modelos
const Usuario = require('../models/usuario');
const jwt = require('../services/jwt');
const util = require('../utils/utils');
const formidable = require('formidable'); // Libreria para forms
const FCM = require('fcm-push');

const fs = require('fs');

//iniciar fcm para enviar notificaciones
const serverKey = 'AAAAcJVq8Mc:APA91bH8M4VhFUVtErhwLQQht0PMRcNmSy2tTColeITAQAZhAvHvO_Le2CM2hGPRbycZX_ZiNRLdks1yhvuC8VhHXQ_29OegAPIkugo1JyteMt6jU_UhXF4zU8yzrzpdMth8bbuFMbPE';
const fcm = new FCM(serverKey);

function inicioSesion(req, res) {
    //Recoger los Parametros de la Peticion
    const params = req.body;
    const rut = params.rut;
    const password = params.password;
    Usuario.findOne({}).select('+password').or([{rut: rut}, {email: rut}]).exec(function (err, usuario_encontrado) {
        if (err) {
            res.status(500).send({desc: 'Error del servidor', message: err.errmsg})
        } else {
            if (!usuario_encontrado) {
                res.status(401).send({desc: 'Usuario o contraseña incorrectos.'})
            } else {
                bcrypt.compare(password, usuario_encontrado.password, function (err, check) {
                    if (check) {
                        if (params.gettoken) {
                            usuario_encontrado["password"] = "";
                            res.status(200).send({token: jwt.createToken(usuario_encontrado)});
                        } else {
                            usuario_encontrado["password"] = "";
                            res.status(200).send(usuario_encontrado);
                        }
                    } else {
                        res.status(400).send({desc: 'La contraseña es incorrecta'});
                    }
                });
            }
        }
    });
}

function getNumberUsers(req, res) {
    Usuario.count({}, function (err, count) {
        res.status(200).send({nusuarios: count});
    });
}

function registrarUsuario(req, res) {
    //Crear Objeto Usuario
    let usuario = new Usuario();
    //Recoger los Parametros de la Peticion
    const params = req.body;
    for (let [key, value] of Object.entries(params)) {
        util.assign(usuario, key.split("."), value)
    }

    usuario.partidasJugadas = 0;
    usuario.partidasGanadas = 0;
    usuario.partidasPerdidas = 0;
    usuario.puntaje = 1200;

    // Guardar usuario
    usuario.save((err, usuario_guardado) => {
        if (err) {
            res.status(500).send({
                desc: 'Error al Guardar Usuario',
                message: err.errmsg
            });
        } else {
            if (!usuario_guardado) {
                res.status(404).send({desc: 'No se ha Guardado el Usuario'});
            } else {
                res.status(200).send(usuario_guardado);
                const message = {
                    to: usuario_guardado.tokenFirebase,
                    collapse_key: 'Registro',
                    notification: {
                        title: 'Registro',
                        body: 'Gracias por registrarte a Ranked UCN'
                    }
                };

                fcm.send(message)
                    .then(function (response) {
                        console.log("Notificacion enviada: ", response);
                    })
                    .catch(function (err) {
                        console.log("Error al enviar la notificacion!");
                        console.error(err);
                    })
            }
        }
    });
}

function getTop10(req, res) {

    //buscar el top 10
    Usuario.find({puntaje: {$exists: true}}).select('-password -_id').sort({puntaje: -1}).limit(10).exec(function (err, usuarios) {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            });
        } else {
            res.status(200).send(usuarios);
        }
    });
}

function actualizarTokenFirebase(req, res) {

    const usuario = req.usuario;
    const params = req.body;

    Usuario.findOne({_id: usuario._id}, (err, usuario_encontrado) => {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            })
        } else {
            if (usuario_encontrado.tokenFirebase === params.token) {
                res.status(500).send({
                    desc: 'Los token son iguales'
                })
            } else {
                usuario_encontrado.tokenFirebase = params.token;
                usuario_encontrado.save((err, usuario_guardado) => {
                    if (err) {
                        res.status(500).send({
                            desc: 'Error en el servidor',
                            err: err.message
                        });
                    } else {
                        res.status(200).send({
                            token: usuario_guardado.tokenFirebase
                        });
                    }
                });
            }
        }
    });
}

function uploadAvatar(req, res) {
    const form = new formidable.IncomingForm();
    form.uploadDir = __dirname + "../../../img";
    form.keepExtensions = true;
    form.parse(req, function (err, fields, files) {
        if (!err) {
            const nombre = 'upload' + files.file.path.split('upload')[1];
            if (files.file.type !== 'image/png' && files.file.type !== 'image/jpg' && files.file.type !== 'image/jpeg') {
                /*try {
                    fs.unlinkSync(files.file.path);
                } catch (err) {
                    console.log('Archivo no existe');
                }*/
                res.status(500).send({desc: 'Archivo con formato Invalido'});
            } else {
                Usuario.findOne({rut: req.usuario.rut}, (err, usuario_encontrado) => {
                    if (err) {
                        res.status(500).send({desc: 'Error del servidor. No se encontró usuario', message: err.errmsg});
                    } else {
                        if (!usuario_encontrado) {
                            res.status(404).send({desc: 'usuario vacio', error: 1, message: 'Usuario no valido.'});
                        } else {
                            const avatarAntiguo = usuario_encontrado.avatar;
                            usuario_encontrado.avatar = nombre;
                            usuario_encontrado.save((err, usuario_guardado) => {
                                if (err) {
                                    res.status(500).send({
                                        desc: 'Error al Guardar Usuario',
                                        message: err.errmsg
                                    });
                                } else {
                                    if (!usuario_guardado) {
                                        res.status(404).send({
                                            desc: 'Usuario vacio',
                                            message: 'No se ha Guardado el Usuario'
                                        });
                                    } else {
                                        usuario_guardado.password = '';
                                        /*try {
                                            fs.unlinkSync(files.file.path.split('upload')[0] + avatarAntiguo);
                                        } catch (error) {
                                            console.log('no existe archivo');
                                        }*/
                                        res.setHeader('Content-Type', 'application/json');
                                        res.status(200).send({
                                            avatar: nombre,
                                            usuario: usuario_guardado
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        } else {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.errmsg
            });
        }
    });
}

function actualizar(req, res) {
    const usuario = req.usuario;

    Usuario.findOne({_id: usuario.sub}).select('partidasJugadas partidasGanadas partidasPerdidas puntaje').exec(function (err, usuarios) {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            });
        } else {
            res.status(200).send(usuarios);
        }
    });
}

function buscarUsuario(req, res) {

    const usuario = req.usuario;

    Usuario.find({ rut: { $nin: [usuario.rut] } }).select('puntaje partidasJugadas apellido nombre email rut avatar partidasGanadas partidasPerdidas').exec(function (err, usuarios_encontrados) {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            })
        } else {
            if (!usuarios_encontrados.length) {
                res.status(404).send({
                    desc: 'Usuarios no encontrados'
                })
            } else {
                res.status(200).send(usuarios_encontrados);
            }
        }
    })

}

function buscarUsuarioUnico(req, res) {
    const usuario = req.usuario;
    const body = req.body;

    if (usuario.rut === body.rutmail || usuario.email === body.rutmail) {
        res.status(500).send({
            desc: 'No te puedes buscar a ti mismo'
        })
    } else {
        Usuario.findOne({}).select('puntaje partidasJugadas apellido nombre email rut avatar partidasGanadas partidasPerdidas').or([{rut: body.rutmail}, {email: body.rutmail}]).exec(function (err, usuario_encontrado) {
            if (err) {
                res.status(500).send({desc: 'Error del servidor', message: err.errmsg})
            } else {
                if (!usuario_encontrado) {
                    res.status(401).send({desc: 'Usuario o contraseña incorrectos.'})
                } else {
                    res.status(200).send(usuario_encontrado);
                }
            }
        });
    }
}

module.exports = {
    inicioSesion,
    getTop10,
    actualizarTokenFirebase,
    getNumberUsers,
    registrarUsuario,
    uploadAvatar,
    actualizar,
    buscarUsuario,
    buscarUsuarioUnico
};