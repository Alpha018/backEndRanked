/**
 * Created by Tomás on 24-12-2017.
 */
'use strict';

const jwt = require('jwt-simple');
const moment = require('moment');
const claveSecreta = process.env.clave || 'K0CfopgghmQS0HLpLGCw';

exports.createToken = function(usuario){
    const payload = {
        sub: usuario._id,
        rut: usuario.rut,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        partidasJugadas: usuario.partidasJugadas,
        puntaje: usuario.puntaje,
        iat: moment().unix(),
        exp: moment().add(10,'hours').unix,
    };

    return jwt.encode(payload, claveSecreta);
};