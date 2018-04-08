/**
 * Created by Tomás on 24-03-2018.
 */
'use strict';

const express = require('express');
const partidaController = require('../controllers/partida');
const mdAuth = require('../midleware/midleware');

const api = express.Router();

// api.put('/pushTarea', mdAuth.ensureAuth, asuntoController.pushTarea); EJEMPLO


module.exports = api;