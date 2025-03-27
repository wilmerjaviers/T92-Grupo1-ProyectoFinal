const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, authRole } = require('../middleware/authMiddleware');


router.get('/vehiculos', (req, res) => {
    const sql = 'SELECT * FROM vehiculos';
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener vehículos:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            vehiculos: results 
        });
    });
});


router.get('/vehiculos/:id', (req, res) => {
    const id = req.params.id;
    
    const sql = 'SELECT * FROM vehiculos WHERE id_vehiculo = ?';
    
    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener vehículo:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Vehículo no encontrado' 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            vehiculo: results[0] 
        });
    });
});


router.post('/vehiculos', authMiddleware, authRole(['admin', 'vendedor']), (req, res) => {
    const { marca, modelo, año, precio, descripcion } = req.body;

  
    if (!marca || !modelo || !año || !precio) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Los campos marca, modelo, año y precio son requeridos' 
        });
    }

    
    if (isNaN(año) || isNaN(precio) || año <= 0 || precio <= 0) {
        return res.status(400).json({ 
            status: 400, 
            message: 'El año y el precio deben ser números positivos' 
        });
    }

    const sql = 'INSERT INTO vehiculos (marca, modelo, año, precio, descripcion) VALUES (?, ?, ?, ?, ?)';
    
    pool.query(sql, [marca, modelo, año, precio, descripcion || null], (err, result) => {
        if (err) {
            console.error('Error al insertar vehículo:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error al insertar el vehículo' 
            });
        }

        const nuevoVehiculo = {
            id_vehiculo: result.insertId,
            marca,
            modelo,
            año,
            precio,
            descripcion,
            disponibilidad: true
        };

        res.status(201).json({ 
            status: 201, 
            message: 'Vehículo registrado exitosamente', 
            vehiculo: nuevoVehiculo 
        });
    });
});


router.put('/vehiculos/:id', authMiddleware, authRole(['admin', 'vendedor']), (req, res) => {
    const id = req.params.id;
    const { marca, modelo, año, precio, disponibilidad, descripcion } = req.body;

 
    if (!marca && !modelo && !año && precio === undefined && disponibilidad === undefined && !descripcion) {
        return res.status(400).json({ 
            status: 400, 
            message: 'No se proporcionó ningún campo para actualizar' 
        });
    }

 
    let updates = [];
    let values = [];

    if (marca) {
        updates.push('marca = ?');
        values.push(marca);
    }

    if (modelo) {
        updates.push('modelo = ?');
        values.push(modelo);
    }

    if (año) {
        if (isNaN(año) || año <= 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'El año debe ser un número positivo' 
            });
        }
        updates.push('año = ?');
        values.push(año);
    }

    if (precio !== undefined) {
        if (isNaN(precio) || precio <= 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'El precio debe ser un número positivo' 
            });
        }
        updates.push('precio = ?');
        values.push(precio);
    }

    if (disponibilidad !== undefined) {
        updates.push('disponibilidad = ?');
        values.push(disponibilidad ? 1 : 0);
    }

    if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        values.push(descripcion);
    }

    values.push(id);
    const sql = `UPDATE vehiculos SET ${updates.join(', ')} WHERE id_vehiculo = ?`;

    pool.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error al actualizar vehículo:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error al actualizar el vehículo' 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Vehículo no encontrado' 
            });
        }

       
        const sqlGet = 'SELECT * FROM vehiculos WHERE id_vehiculo = ?';
        
        pool.query(sqlGet, [id], (err, results) => {
            if (err) {
                return res.status(200).json({ 
                    status: 200, 
                    message: 'Vehículo actualizado exitosamente' 
                });
            }

            res.status(200).json({ 
                status: 200, 
                message: 'Vehículo actualizado exitosamente', 
                vehiculo: results[0] 
            });
        });
    });
});


router.delete('/vehiculos/:id', authMiddleware, authRole(['admin']), (req, res) => {
    const id = req.params.id;

 
    const sqlCheck = 'SELECT id_venta FROM ventas WHERE id_vehiculo = ?';
    
    pool.query(sqlCheck, [id], (err, results) => {
        if (err) {
            console.error('Error al verificar ventas:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (results.length > 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'No se puede eliminar el vehículo porque tiene ventas asociadas' 
            });
        }

  
        const sqlDelete = 'DELETE FROM vehiculos WHERE id_vehiculo = ?';
        
        pool.query(sqlDelete, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar vehículo:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error al eliminar el vehículo' 
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    status: 404, 
                    message: 'Vehículo no encontrado' 
                });
            }

            res.status(200).json({ 
                status: 200, 
                message: 'Vehículo eliminado exitosamente' 
            });
        });
    });
});



module.exports = router;