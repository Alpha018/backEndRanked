/**
 * Created by Tomás on 17-12-2017.
 */
'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

app.use((req, res, next) =>{
    res.header('Access-Control-Allow-Origin','*');
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Allow', 'GET, POST, OPTION, PUT, DELETE');

    next();
});

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

//cargar rutas
const usuario_routes = require('./server/routes/usuario');
const partida_routes = require('./server/routes/partida');

// Angular DIST output folder
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname + '/img'));

//Ruta Base
app.use('/api/usuario', usuario_routes);
app.use('/api/partida', partida_routes);

// ruta para las imagenes de perfiles publicas
app.get('/public/img/:img?', (req, res) => {
    const params = req.params;
    const img = fs.readFileSync(__dirname + '/img/' + params.img);
    res.writeHead(200, {'Content-Type': 'image/png' });
    res.end(img, 'binary');
});

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

//rutas body-parser
module.exports = app;