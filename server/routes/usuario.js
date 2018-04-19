/**
 * Created by Tomás on 24-03-2018.
 */
'use strict';

const express = require('express');
const usuarioController = require('../controllers/usuario');
const mdAuth = require('../midleware/midleware');

const api = express.Router();

// api.put('/pushTarea', mdAuth.ensureAuth, asuntoController.pushTarea); EJEMPLO
api.put('/register', usuarioController.registrarUsuario);
api.post('/login', usuarioController.inicioSesion);
api.post('/uploadAvatar', mdAuth.ensureAuth, usuarioController.uploadAvatar);
api.get('/top10', mdAuth.ensureAuth, usuarioController.getTop10);
api.post('/actualizarTokenFirebase', mdAuth.ensureAuth, usuarioController.actualizarTokenFirebase);
api.get('/actualizar', mdAuth.ensureAuth, usuarioController.actualizar);
api.get('/usuariosmatch', mdAuth.ensureAuth, usuarioController.buscarUsuario);
api.post('/buscarusuario', mdAuth.ensureAuth, usuarioController.buscarUsuarioUnico);


module.exports = api;