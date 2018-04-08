/**
 * Created by Tomás on 24-03-2018.
 */

'use strict';
const bcrypt = require('bcrypt-nodejs');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Schema = mongoose.Schema;

const usuarioSchema = new Schema({
    deviceId: {
        type: String,
        unique: true
    },
    rut: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate: [function validaRut(campo) {
            if ( campo.length === 0 ) { return false; }
            if (!/^[0-9]+[-|‐]?[0-9kK]$/.test(campo)) { return false; }

            campo = campo.replace('-', '');
            campo = campo.replace(/\./g, '');

            let suma = 0;
            const caracteres = '1234567890kK';
            let contador = 0;
            for (let i = 0; i < campo.length; i++) {
                const u = campo.substring(i, i + 1);
                if (caracteres.indexOf(u) !== -1) {
                    contador++;
                }
            }
            if ( contador === 0 ) {
                return false
            }

            const rut = campo.substring(0, campo.length - 1);
            const drut = campo.substring( campo.length - 1 );
            let dvr = '0';
            let mul = 2;

            for (let i = rut.length - 1; i >= 0; i--) {
                suma = suma + rut.charAt(i) * mul;
                if (mul === 7) {
                    mul = 2
                } else {
                    mul++
                }
            }
            const res = suma % 11;
            if (res === 1) {
                dvr = 'k';
            } else if (res === 0) {
                dvr = '0';
            } else {
                const dvi = 11 - res;
                dvr = dvi + '';
            }
            return dvr === drut.toLowerCase();
        }, 'El rut ingresado no es valido.'],
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    // Solo persona
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate: [function(email) {
            return /^[a-zA-Z0-9.!#$%&’*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)
        },'El email utilizado no es valido.']
    },
    //Nombre Completo
    nombre: {
        type: String,
        required: true,
        trim: true,
    },
    apellido: {
        type: String,
        required: true,
        trim: true,
    },
    partidasJugadas: {
        type: Number,
        required: true,
        trim: true,
    },
    partidasGanadas: {
        type: Number,
        required: true,
        trim: true,
    },
    partidasPerdidas: {
        type: Number,
        required: true,
        trim: true,
    },
    puntaje: {
        type: Number,
        required: true,
        trim: true,
    },
    avatar: {
        type: String,
        trim: true,
        default: 'default.png'
    },
});

usuarioSchema.plugin(mongoosePaginate);

usuarioSchema.pre('save', function(next) {
    let user = this;

    if (user.isModified('rut')) {
        let rut = user.rut;
        rut = rut.replace('-', '');
        rut = rut.replace(/\./g, '');
        rut = rut.substr(0, rut.length-1) + "-" + rut.substr(-1);
        user.rut = rut;
    }
    if (user.isModified('password')) {
        user.password = bcrypt.hashSync(user.password);
    }
    next();
});

usuarioSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('usuario', usuarioSchema);
