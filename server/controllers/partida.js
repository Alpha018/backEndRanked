/**
 * Created by Tomás on 24-03-2018.
 */
'use strict';
//modelos
const Partida = require('../models/partida');
const Usuario = require('../models/usuario');
const FCM = require('fcm-push');

const fs = require('fs');

//iniciar fcm para enviar notificaciones
const serverKey = 'AAAAcJVq8Mc:APA91bH8M4VhFUVtErhwLQQht0PMRcNmSy2tTColeITAQAZhAvHvO_Le2CM2hGPRbycZX_ZiNRLdks1yhvuC8VhHXQ_29OegAPIkugo1JyteMt6jU_UhXF4zU8yzrzpdMth8bbuFMbPE';
const fcm = new FCM(serverKey);

function getPartidasUsuario(req, res) {
    const usuario = req.usuario;

    Partida.find({
        usuarioSegundario: usuario.sub,
        confirmado: false
    }).populate({
        path: 'usuarioPrincipal',
        model: 'usuario',
        select: 'rut email nombre apellido avatar',
    }).populate({
        path: 'usuarioSegundario',
        model: 'usuario',
        select: 'rut email nombre apellido avatar',
    }).populate({
        path: 'ganador',
        model: 'usuario',
        select: 'rut email nombre apellido avatar',
    }).sort({fecha: -1}).exec(function (err, partidas_encontradas) {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            })
        } else {
            if (!partidas_encontradas.length) {
                res.status(404).send({
                    desc: 'Partidas no encontradas'
                })
            } else {
                res.status(200).send(partidas_encontradas);
            }
        }
    })
}

function acceptarMatch(req, res) {
    const usuario = req.usuario;
    const body = req.body;
    // TODO: hacer la modificación en los puntajes de los jugadores
    Partida.findOne({_id: body._id}, (err, partida_encontrada) => {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            })
        } else {
            if (!partida_encontrada) {
                res.status(404).send({
                    desc: 'Partida no encontrada'
                })
            } else {
                if (partida_encontrada.usuarioPrincipal.toString() === usuario.sub || partida_encontrada.usuarioSegundario.toString() === usuario.sub) {
                    partida_encontrada.confirmado = true;

                    partida_encontrada.save((err, partida_guardada) => {
                        if (err) {
                            res.status(500).send({
                                desc: 'Error en el servidor',
                                err: err.message
                            })
                        } else {
                            if (!partida_guardada) {
                                res.status(404).send({
                                    desc: 'Partida no se guardó correctamente'
                                })
                            } else {
                                if (partida_guardada.ganador === null) {
                                    Usuario.findOne({_id: partida_guardada.usuarioPrincipal}, (err, usuario_encontrado) => {
                                        usuario_encontrado.partidasJugadas++;
                                        Usuario.findOne({_id: partida_guardada.usuarioSegundario}, (err, segundo) => {
                                            segundo.partidasJugadas++;

                                            const puntajes = calcularPuntajeEmpate(usuario_encontrado, segundo);

                                            usuario_encontrado.puntaje = puntajes.usuario1;
                                            segundo.puntaje = puntajes.usuario2;

                                            usuario_encontrado.save((err, usuario_encontrado_guardado) => {
                                               if (err) {
                                                   res.status(500).send({
                                                       desc: 'Error en el servidor',
                                                       err: err.message
                                                   })
                                               } else {
                                                   segundo.save((err, segundo_guardado) => {
                                                       if (err) {
                                                           res.status(500).send({
                                                               desc: 'Error en el servidor',
                                                               err: err.message
                                                           })
                                                       } else {
                                                           try {
                                                               const message = {
                                                                   to: usuario_encontrado_guardado.tokenFirebase,
                                                                   collapse_key: 'Match',
                                                                   notification: {
                                                                       title: 'match',
                                                                       body: 'Empate!!, Empataste una partida contra: ' + segundo_guardado.nombre + ' ' + segundo_guardado.apellido
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
                                                           } catch (e) {
                                                               console.log("Error al enviar mensaje " + e.message);
                                                           }
                                                           try {
                                                               const message = {
                                                                   to: segundo_guardado.tokenFirebase,
                                                                   collapse_key: 'Match',
                                                                   notification: {
                                                                       title: 'match',
                                                                       body: 'Empate!!, Empataste una partida contra: ' + usuario_encontrado_guardado.nombre + ' ' + usuario_encontrado_guardado.apellido
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
                                                           } catch (e) {
                                                               console.log("Error al enviar mensaje " + e.message);
                                                           }
                                                           res.status(200).send(partida_guardada);
                                                       }
                                                   })
                                               }
                                            });
                                        });
                                    });
                                } else {
                                    if (partida_guardada.ganador.toString() === partida_guardada.usuarioPrincipal.toString()) { // AQUI GANÓ EL USUARIO PRINCIPAL
                                        Usuario.findOne({_id: partida_guardada.usuarioPrincipal}, (err, usuario_encontrado) => {
                                            usuario_encontrado.partidasJugadas++;
                                            usuario_encontrado.partidasGanadas++;
                                            //actualizar el puntaje con la formula (GANADOR)

                                            Usuario.findOne({_id: partida_guardada.usuarioSegundario}, (err, segundo) => {
                                                segundo.partidasJugadas++;
                                                segundo.partidasPerdidas++;
                                                //actualizar el puntaje del PERDEDOR

                                                const puntajes = calcularNuevoPuntaje(usuario_encontrado, segundo);
                                                usuario_encontrado.puntaje = puntajes.ganador;
                                                segundo.puntaje = puntajes.perdedor;

                                                if (usuario_encontrado.puntaje > 2400) {
                                                    usuario_encontrado.alcanzo = true;
                                                }
                                                if (segundo.puntaje > 2400) {
                                                    segundo.alcanzo = true;
                                                }

                                                usuario_encontrado.save((err, usuario_ganador) => {
                                                    if (err) {
                                                        res.status(500).send({
                                                            desc: 'Error en el servidor',
                                                            err: err.message
                                                        })
                                                    } else {
                                                        segundo.save((err, segundo_guardado) => {
                                                            if (err) {
                                                                res.status(500).send({
                                                                    desc: 'Error en el servidor',
                                                                    err: err.message
                                                                })
                                                            } else {
                                                                try {
                                                                    const message = {
                                                                        to: usuario_ganador.tokenFirebase,
                                                                        collapse_key: 'Match',
                                                                        notification: {
                                                                            title: 'match',
                                                                            body: 'Victoria!!, Ganaste una partida contra: ' + segundo_guardado.nombre + ' ' + segundo_guardado.apellido
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
                                                                } catch (e) {
                                                                    console.log("Error al enviar mensaje " + e.message);
                                                                }
                                                                try {
                                                                    const message = {
                                                                        to: segundo_guardado.tokenFirebase,
                                                                        collapse_key: 'Match',
                                                                        notification: {
                                                                            title: 'match',
                                                                            body: 'DERROTA!!, Perdiste una partida contra: ' + usuario_ganador.nombre + ' ' + usuario_ganador.apellido
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
                                                                } catch (e) {
                                                                    console.log("Error al enviar mensaje " + e.message);
                                                                }
                                                                res.status(200).send(partida_guardada);
                                                            }
                                                        })
                                                    }
                                                });

                                            });
                                        });
                                    } else { //aqui ganó el segundo usuario
                                        Usuario.findOne({_id: partida_guardada.usuarioSegundario}, (err, usuario_encontrado) => {
                                            usuario_encontrado.partidasJugadas++;
                                            usuario_encontrado.partidasGanadas++;
                                            //actualizar el puntaje con la formula (GANADOR)

                                            Usuario.findOne({_id: partida_guardada.usuarioPrincipal}, (err, segundo) => {
                                                segundo.partidasJugadas++;
                                                segundo.partidasPerdidas++;
                                                //actualizar el puntaje del PERDEDOR

                                                const puntajes = calcularNuevoPuntaje(usuario_encontrado, segundo);
                                                usuario_encontrado.puntaje = puntajes.ganador;
                                                segundo.puntaje = puntajes.perdedor;

                                                if (usuario_encontrado.puntaje > 2400) {
                                                    usuario_encontrado.alcanzo = true;
                                                }
                                                if (segundo.puntaje > 2400) {
                                                    segundo.alcanzo = true;
                                                }

                                                usuario_encontrado.save((err, usuario_ganador) => {
                                                    if (err) {
                                                        res.status(500).send({
                                                            desc: 'Error en el servidor',
                                                            err: err.message
                                                        })
                                                    } else {
                                                        segundo.save((err, segundo_guardado) => {
                                                            if (err) {
                                                                res.status(500).send({
                                                                    desc: 'Error en el servidor',
                                                                    err: err.message
                                                                })
                                                            } else {
                                                                try {
                                                                    const message = {
                                                                        to: usuario_ganador.tokenFirebase,
                                                                        collapse_key: 'Match',
                                                                        notification: {
                                                                            title: 'match',
                                                                            body: 'Victoria!!, Ganaste una partida contra: ' + segundo_guardado.nombre + ' ' + segundo_guardado.apellido
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
                                                                } catch (e) {
                                                                    console.log("Error al enviar mensaje " + e.message);
                                                                }
                                                                try {
                                                                    const message = {
                                                                        to: segundo_guardado.tokenFirebase,
                                                                        collapse_key: 'Match',
                                                                        notification: {
                                                                            title: 'match',
                                                                            body: 'DERROTA!!, Perdiste una partida contra: ' + usuario_ganador.nombre + ' ' + usuario_ganador.apellido
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
                                                                } catch (e) {
                                                                    console.log("Error al enviar mensaje " + e.message);
                                                                }
                                                                res.status(200).send(partida_guardada);
                                                            }
                                                        })
                                                    }
                                                });

                                            });
                                        });
                                    }
                                }
                            }
                        }
                    })
                } else {
                    res.status(403).send({
                        desc: 'El usuario que envio la petición no es un contendiente de la match'
                    })
                }
            }
        }
    })
}

function hacerMatch(req, res) {

    const usuario = req.usuario;
    const body = req.body;

    Usuario.findOne({_id: usuario.sub}, (err, usuario) => {
        if (err) {
            res.status(500).send({
                desc: 'Error en el servidor',
                err: err.message
            })
        } else {
            if (!usuario) {
                res.status(404).send({
                    desc: 'Usuario no encontrado'
                })
            } else {
                Usuario.findOne({rut: body.rutSegundo}, (err, segundo) => {
                    if (err) {
                        res.status(500).send({
                            desc: 'Error en el servidor',
                            err: err.message
                        })
                    } else {
                        if (!segundo) {
                            res.status(404).send({
                                desc: 'Contrincante no encontrado'
                            })
                        } else {
                            const partida = new Partida();
                            partida.usuarioPrincipal = usuario;
                            partida.usuarioSegundario = segundo;
                            partida.fecha = new Date();

                            if (body.rutGanador === undefined) {
                                partida.ganador = null;

                                partida.save((err, partida_guardada) => {
                                    if (err) {
                                        res.status(500).send({
                                            desc: 'Error en el servidor',
                                            err: err.message
                                        })
                                    } else {
                                        if (!partida_guardada) {
                                            res.status(404).send({
                                                desc: 'Partida no se guardó correctamente'
                                            })
                                        } else {
                                            try {
                                                const message = {
                                                    to: segundo.tokenFirebase,
                                                    collapse_key: 'Contienda',
                                                    notification: {
                                                        title: 'Contienda',
                                                        body: 'RETO!!, ' + usuario.nombre + ' ' + usuario.apellido + ', Te retó a un duelo, revisa tus partidas pendientes para más información'
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
                                            } catch (e) {
                                                console.log("Error al enviar mensaje " + e.message);
                                            }
                                            res.status(200).send(partida_guardada);
                                        }
                                    }
                                })

                            } else {
                                Usuario.findOne({rut: body.rutGanador}, (err, ganador_encontrado) => {
                                    if (err) {
                                        res.status(500).send({
                                            desc: 'Error en el servidor',
                                            err: err.message
                                        })
                                    } else {
                                        if (!ganador_encontrado) {
                                            res.status(404).send({
                                                desc: 'No se encontró el rut del ganador'
                                            })
                                        } else {
                                            partida.ganador = ganador_encontrado;
                                            
                                            partida.save((err, partida_guardada) => {
                                                if (err) {
                                                    res.status(500).send({
                                                        desc: 'Error en el servidor',
                                                        err: err.message
                                                    })
                                                } else {
                                                    if (!partida_guardada) {
                                                        res.status(404).send({
                                                            desc: 'Partida no se guardó correctamente'
                                                        })
                                                    } else {
                                                        try {
                                                            const message = {
                                                                to: segundo.tokenFirebase,
                                                                collapse_key: 'Contienda',
                                                                notification: {
                                                                    title: 'Contienda',
                                                                    body: 'RETO!!, ' + usuario.nombre + ' ' + usuario.apellido + ', Te retó a un duelo, revisa tus partidas pendientes para más información'
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
                                                        } catch (e) {
                                                            console.log("Error al enviar mensaje " + e.message);
                                                        }
                                                        res.status(200).send(partida_guardada);
                                                    }
                                                }
                                            })
                                        }
                                    }
                                })
                            }
                        }
                    }
                })
            }
        }
    });
}

function calcularNuevoPuntaje(ganador, perdedor) {
    const SGanador = Math.pow(10, (ganador.puntaje / 400));
    const SPerdedor = Math.pow(10, (ganador.puntaje / 400));

    const EGanador = SGanador / (SGanador + SPerdedor);
    const EPerdedor = SPerdedor / (SGanador + SPerdedor);

    const PuntajeG = ganador.puntaje + calcularK(ganador) * (1 - EGanador);
    const PuntajeP = perdedor.puntaje + calcularK(perdedor) * (0 - EPerdedor);

    return {ganador: PuntajeG, perdedor: PuntajeP};
}

function calcularPuntajeEmpate(usuario1, usuario2) {
    const SGanador = Math.pow(10, (usuario1.puntaje / 400));
    const SPerdedor = Math.pow(10, (usuario2.puntaje / 400));

    const EGanador = SGanador / (SGanador + SPerdedor);
    const EPerdedor = SPerdedor / (SGanador + SPerdedor);

    const PuntajeG = usuario1.puntaje + calcularK(usuario1) * (0.5 - EGanador);
    const PuntajeP = usuario2.puntaje + calcularK(usuario2) * (0.5 - EPerdedor);

    return {usuario1: Math.round(PuntajeG), usuario2: Math.round(PuntajeP)};
}

function calcularK(usuario) {
    if (usuario.alcanzo) {
        return 16;
    } else if (usuario.puntaje < 2100) {
        return 32;
    } else if (usuario.puntaje >= 2100 || usuario.puntaje <= 2400) {
        return 24;
    }
}

module.exports = {
    getPartidasUsuario,
    acceptarMatch,
    hacerMatch
};