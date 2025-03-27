const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

const PORT = process.env.PORT || 3000;


const authUsers = require('./routes/authUsers');
const vehiculos = require('./routes/vehiculos');
const clientes = require('./routes/clientes');
const ventas = require('./routes/ventas');


app.use(express.json());
app.use(cors());


app.use('/api', authUsers);
app.use('/api', vehiculos);
app.use('/api', clientes);
app.use('/api', ventas);


app.get('/', (req, res) => {
    res.json({
        message: 'API de Autolote funcionando correctamente',
    });
});


app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: 'Ruta no encontrada'
    });
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});