/**
 * Created by Tomás on 24-03-2018.
 */

'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const partidaSchema = new Schema({
    usuarioPrincipal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'usuario',
        required: true,
    },
    usuarioSegundario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'usuario',
        required: true,
    },
    fecha: {
        type: Date,
        required: true,
        trim: true,
    },
    ganador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'usuario',
    },
    confirmado: {
        type: Boolean,
        required: true,
        default: false
    }
});

module.exports = mongoose.model('partida', partidaSchema);
