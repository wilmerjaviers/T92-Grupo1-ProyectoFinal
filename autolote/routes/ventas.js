const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, authRole } = require('../middleware/authMiddleware');
const { convertCurrency } = require('../utils/tasasDeCambio');

router.post('/ventas', authMiddleware, authRole(['admin', 'vendedor']), (req, res) => {
    const { id_vehiculo, id_cliente, precio_final, impuestos } = req.body;
    const id_vendedor = req.user.id; 

  
    if (!id_vehiculo || !id_cliente || !precio_final || !impuestos) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Todos los campos son requeridos' 
        });
    }

  
    const sqlCheckVehiculo = 'SELECT * FROM vehiculos WHERE id_vehiculo = ? AND disponibilidad = 1';
    
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
                message: 'Vehículo no encontrado o no disponible' 
            });
        }

       
        const sqlCheckCliente = 'SELECT * FROM clientes WHERE id_cliente = ?';
        
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

           
            const total = parseFloat(precio_final) + parseFloat(impuestos);

            
            pool.getConnection((err, connection) => {
                if (err) {
                    console.error('Error al obtener conexión:', err);
                    return res.status(500).json({ 
                        status: 500, 
                        message: 'Error del servidor' 
                    });
                }

                connection.beginTransaction(err => {
                    if (err) {
                        connection.release();
                        console.error('Error al iniciar transacción:', err);
                        return res.status(500).json({ 
                            status: 500, 
                            message: 'Error del servidor' 
                        });
                    }

                   
                    const sqlInsertVenta = `
                        INSERT INTO ventas 
                        (id_vehiculo, id_cliente, id_vendedor, precio_final, impuestos, total) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    connection.query(
                        sqlInsertVenta, 
                        [id_vehiculo, id_cliente, id_vendedor, precio_final, impuestos, total], 
                        (err, ventaResult) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error('Error al insertar venta:', err);
                                    res.status(500).json({ 
                                        status: 500, 
                                        message: 'Error al registrar venta' 
                                    });
                                });
                            }

                           
                            const sqlUpdateVehiculo = 'UPDATE vehiculos SET disponibilidad = 0 WHERE id_vehiculo = ?';
                            
                            connection.query(sqlUpdateVehiculo, [id_vehiculo], (err, updateResult) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error('Error al actualizar vehículo:', err);
                                        res.status(500).json({ 
                                            status: 500, 
                                            message: 'Error al actualizar disponibilidad del vehículo' 
                                        });
                                    });
                                }

                               
                                connection.commit(async err => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            console.error('Error al confirmar transacción:', err);
                                            res.status(500).json({ 
                                                status: 500, 
                                                message: 'Error al confirmar venta' 
                                            });
                                        });
                                    }

                                    connection.release();

                                    
                                    try {
                                        const conversionResult = await convertCurrency(total);
                                        
                                        res.status(201).json({ 
                                            status: 201, 
                                            message: 'Venta registrada exitosamente', 
                                            id_venta: ventaResult.insertId,
                                            total: total,
                                            moneda_base: 'USD',
                                            conversiones: conversionResult.success ? conversionResult.conversions : null
                                        });
                                    } catch (error) {
                                        
                                        res.status(201).json({ 
                                            status: 201, 
                                            message: 'Venta registrada exitosamente', 
                                            id_venta: ventaResult.insertId,
                                            total: total
                                        });
                                    }
                                });
                            });
                        }
                    );
                });
            });
        });
    });
});


router.get('/ventas', authMiddleware, authRole(['admin', 'vendedor']), async (req, res) => {
    const { fecha_inicio, fecha_fin, id_vendedor } = req.query;
    
    let sql = `
        SELECT v.*, 
               veh.marca, veh.modelo, veh.año,
               c.nombre as nombre_cliente,
               u.nombre as nombre_vendedor
        FROM ventas v
        JOIN vehiculos veh ON v.id_vehiculo = veh.id_vehiculo
        JOIN clientes c ON v.id_cliente = c.id_cliente
        JOIN usuarios u ON v.id_vendedor = u.id_usuario
    `;
    
    let conditions = [];
    let values = [];

    if (fecha_inicio) {
        conditions.push('DATE(v.fecha_venta) >= ?');
        values.push(fecha_inicio);
    }

    if (fecha_fin) {
        conditions.push('DATE(v.fecha_venta) <= ?');
        values.push(fecha_fin);
    }

    if (id_vendedor) {
        conditions.push('v.id_vendedor = ?');
        values.push(id_vendedor);
    }

    if (req.user.rol === 'vendedor') {
        conditions.push('v.id_vendedor = ?');
        values.push(req.user.id);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY v.fecha_venta DESC';

    pool.query(sql, values, async (err, results) => {
        if (err) {
            console.error('Error al obtener ventas:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error en la consulta' 
            });
        }

      
        let tasasDeCambio = null;
        try {
          
            const conversionResult = await convertCurrency(1);
            if (conversionResult.success) {
                tasasDeCambio = {};
                Object.keys(conversionResult.conversions).forEach(moneda => {
                    tasasDeCambio[moneda] = conversionResult.conversions[moneda].rate;
                });
            }
        } catch (error) {
            console.error('Error al obtener tasas de cambio:', error);
        }

       
        const ventasConConversiones = await Promise.all(results.map(async (venta) => {
            const ventaResultado = {...venta};
            
          
            if (tasasDeCambio) {
                ventaResultado.moneda_base = 'USD';
                ventaResultado.conversiones = {};
                
                Object.keys(tasasDeCambio).forEach(moneda => {
                    ventaResultado.conversiones[moneda] = {
                        rate: tasasDeCambio[moneda],
                        amount: parseFloat(venta.total) * tasasDeCambio[moneda]
                    };
                });
            }
            
            return ventaResultado;
        }));

        res.status(200).json({ 
            status: 200, 
            message: 'Success', 
            ventas: ventasConConversiones
        });
    });
});

module.exports = router;