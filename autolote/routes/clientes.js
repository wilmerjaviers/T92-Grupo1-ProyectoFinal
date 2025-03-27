const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, authRole } = require('../middleware/authMiddleware');


router.get('/clientes', authMiddleware, authRole(['admin', 'vendedor']), (req, res) => {
    const sql = 'SELECT * FROM clientes';
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener clientes:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            clientes: results 
        });
    });
});


router.get('/clientes/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    
    const sql = 'SELECT * FROM clientes WHERE id_cliente = ?';
    
    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener cliente:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Cliente no encontrado' 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            cliente: results[0] 
        });
    });
});


router.post('/clientes', (req, res) => {
    const { nombre, correo, telefono } = req.body;

   
    if (!nombre || !correo) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Los campos nombre y correo son requeridos' 
        });
    }

    
    const sqlCheckEmail = 'SELECT id_cliente FROM clientes WHERE correo = ?';
    
    pool.query(sqlCheckEmail, [correo], (err, results) => {
        if (err) {
            console.error('Error al verificar correo:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (results.length > 0) {
            return res.status(409).json({ 
                status: 409, 
                message: 'El correo electrónico ya está registrado' 
            });
        }

       
        const sqlInsert = 'INSERT INTO clientes (nombre, correo, telefono) VALUES (?, ?, ?)';
        
        pool.query(sqlInsert, [nombre, correo, telefono || null], (err, result) => {
            if (err) {
                console.error('Error al insertar cliente:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error al registrar cliente' 
                });
            }

            const nuevoCliente = {
                id_cliente: result.insertId,
                nombre,
                correo,
                telefono: telefono || null,
                fecha_registro: new Date()
            };

            res.status(201).json({ 
                status: 201, 
                message: 'Cliente registrado exitosamente', 
                cliente: nuevoCliente 
            });
        });
    });
});


router.put('/clientes/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    const { nombre, correo, telefono } = req.body;

   
    const sqlCheck = 'SELECT * FROM clientes WHERE id_cliente = ?';
    
    pool.query(sqlCheck, [id], (err, results) => {
        if (err) {
            console.error('Error al verificar cliente:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Cliente no encontrado' 
            });
        }

        let updates = [];
        let values = [];

        if (nombre) {
            updates.push('nombre = ?');
            values.push(nombre);
        }

        if (correo) {
            updates.push('correo = ?');
            values.push(correo);
        }

        if (telefono !== undefined) {
            updates.push('telefono = ?');
            values.push(telefono);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'No se proporcionaron datos para actualizar' 
            });
        }

        values.push(id);
        const sqlUpdate = `UPDATE clientes SET ${updates.join(', ')} WHERE id_cliente = ?`;

        pool.query(sqlUpdate, values, (err, result) => {
            if (err) {
                console.error('Error al actualizar cliente:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error al actualizar cliente' 
                });
            }

            res.status(200).json({ 
                status: 200, 
                message: 'Cliente actualizado exitosamente' 
            });
        });
    });
});


router.delete('/clientes/:id', authMiddleware, authRole(['admin']), (req, res) => {
    const id = req.params.id;

  
    const sqlCheckVentas = 'SELECT id_venta FROM ventas WHERE id_cliente = ?';
    
    pool.query(sqlCheckVentas, [id], (err, ventas) => {
        if (err) {
            console.error('Error al verificar ventas:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (ventas.length > 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'No se puede eliminar el cliente porque tiene ventas asociadas' 
            });
        }

      
        const sqlCheckConsultas = 'SELECT id_consulta FROM consultas WHERE id_cliente = ?';
        
        pool.query(sqlCheckConsultas, [id], (err, consultas) => {
            if (err) {
                console.error('Error al verificar consultas:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error del servidor' 
                });
            }

           
            if (consultas.length > 0) {
                const sqlDeleteConsultas = 'DELETE FROM consultas WHERE id_cliente = ?';
                
                pool.query(sqlDeleteConsultas, [id], (err) => {
                    if (err) {
                        console.error('Error al eliminar consultas:', err);
                        return res.status(500).json({ 
                            status: 500, 
                            message: 'Error al eliminar consultas asociadas' 
                        });
                    }
                    
                    
                    eliminarCliente();
                });
            } else {
                
                eliminarCliente();
            }
        });
    });

    function eliminarCliente() {
        const sqlDelete = 'DELETE FROM clientes WHERE id_cliente = ?';
        
        pool.query(sqlDelete, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar cliente:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error al eliminar cliente' 
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    status: 404, 
                    message: 'Cliente no encontrado' 
                });
            }

            res.status(200).json({ 
                status: 200, 
                message: 'Cliente eliminado exitosamente' 
            });
        });
    }
});


router.post('/consultas', (req, res) => {
    const { id_cliente, id_vehiculo, mensaje } = req.body;

    
    if (!id_cliente || !id_vehiculo || !mensaje) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Los campos id_cliente, id_vehiculo y mensaje son requeridos' 
        });
    }

    
    const sqlCheckCliente = 'SELECT id_cliente FROM clientes WHERE id_cliente = ?';
    
    pool.query(sqlCheckCliente, [id_cliente], (err, clienteResult) => {
        if (err) {
            console.error('Error al verificar cliente:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (clienteResult.length === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Cliente no encontrado' 
            });
        }

        
        const sqlCheckVehiculo = 'SELECT id_vehiculo FROM vehiculos WHERE id_vehiculo = ?';
        
        pool.query(sqlCheckVehiculo, [id_vehiculo], (err, vehiculoResult) => {
            if (err) {
                console.error('Error al verificar vehículo:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error del servidor' 
                });
            }

            if (vehiculoResult.length === 0) {
                return res.status(404).json({ 
                    status: 404, 
                    message: 'Vehículo no encontrado' 
                });
            }

          
            const sqlInsert = 'INSERT INTO consultas (id_cliente, id_vehiculo, mensaje) VALUES (?, ?, ?)';
            
            pool.query(sqlInsert, [id_cliente, id_vehiculo, mensaje], (err, result) => {
                if (err) {
                    console.error('Error al insertar consulta:', err);
                    return res.status(500).json({ 
                        status: 500, 
                        message: 'Error al registrar consulta' 
                    });
                }

                res.status(201).json({ 
                    status: 201, 
                    message: 'Consulta registrada exitosamente', 
                    id_consulta: result.insertId 
                });
            });
        });
    });
});


router.get('/consultas', authMiddleware, authRole(['admin', 'vendedor']), (req, res) => {
    const { id_cliente, id_vehiculo } = req.query;
    
    let sql = `
        SELECT c.*, cl.nombre as nombre_cliente, v.marca, v.modelo, v.año
        FROM consultas c
        JOIN clientes cl ON c.id_cliente = cl.id_cliente
        JOIN vehiculos v ON c.id_vehiculo = v.id_vehiculo
    `;
    
    let conditions = [];
    let values = [];

    if (id_cliente) {
        conditions.push('c.id_cliente = ?');
        values.push(id_cliente);
    }

    if (id_vehiculo) {
        conditions.push('c.id_vehiculo = ?');
        values.push(id_vehiculo);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.fecha_consulta DESC';

    pool.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error al obtener consultas:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            consultas: results 
        });
    });
});

module.exports = router;