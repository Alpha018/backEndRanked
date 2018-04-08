/**
 * Created by Tomás on 24-03-2018.
 */
'use strict';
const jwt = require('jwt-simple');
const moment = require('moment');
const Usuario = require('../models/usuario');
const claveSecreta = process.env.clave || 'K0CfopgghmQS0HLpLGCw';

function ensureAuth (req, res, next){
    if(!req.headers.authorization){
        return res.status(401).send({message: 'La peticion no tiene cabecera de autenticacion'})
    }

    const token = req.headers.authorization.replace(/['"]+/g, '');
    let payload;

    try{
        payload = jwt.decode(token, claveSecreta);

        if(payload.sub && payload.exp <= moment().unix()){
            return res.status(401).send({
                message: 'El Token ha Expirado'
            });
        }
    }catch(ex){
        return res.status(403).send({
            message: 'El Token no es valido'
        });
    }

    Usuario.findOne({rut: payload.rut}, (err, usuario_encontrado) => {
        if (err) {
            res.status(500).send({desc: 'Error del servidor.', message: err})
        } else {
            if (!usuario_encontrado) {
                res.status(404).send({error: 1, message: 'El token de acceso no es valido.'})
            } else {
                req.usuario = payload;
                next();
            }
        }
    });

}

module.exports = {
    ensureAuth
};