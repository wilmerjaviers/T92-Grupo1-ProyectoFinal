const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authMiddleware, authRole } = require('../middleware/authMiddleware');

require('dotenv').config();

router.post('/usuarios/registro', async (req, res) => {
    const { nombre, correo, contraseña, rol = 'cliente' } = req.body;

   
    if (!nombre || !correo || !contraseña) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Todos los campos son requeridos' 
        });
    }

    
    if (!['admin', 'vendedor', 'cliente'].includes(rol)) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Rol no válido. Debe ser admin, vendedor o cliente' 
        });
    }

    try {
     
        const sqlCheckEmail = 'SELECT * FROM usuarios WHERE correo = ?';
        
        pool.query(sqlCheckEmail, [correo], async (err, result) => {
            if (err) {
                console.error('Error al verificar correo:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error del servidor' 
                });
            }

            if (result.length > 0) {
                return res.status(409).json({ 
                    status: 409, 
                    message: 'El correo electrónico ya está registrado' 
                });
            }

            
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

            
            const sqlInsert = 'INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES (?, ?, ?, ?)';
            
            pool.query(sqlInsert, [nombre, correo, hashedPassword, rol], (err, result) => {
                if (err) {
                    console.error('Error al registrar usuario:', err);
                    return res.status(500).json({ 
                        status: 500, 
                        message: 'Error al registrar usuario' 
                    });
                }

                res.status(201).json({ 
                    status: 201, 
                    message: 'Usuario registrado exitosamente', 
                    id_usuario: result.insertId 
                });
            });
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ 
            status: 500, 
            message: 'Error del servidor' 
        });
    }
});


router.post('/login', async (req, res) => {
    const { correo, contraseña } = req.body;

    
    if (!correo || !contraseña) {
        return res.status(400).json({ 
            status: 400, 
            message: 'Correo y contraseña son requeridos' 
        });
    }

    
    const sql = 'SELECT * FROM usuarios WHERE correo = ?';
    
    pool.query(sql, [correo], async (err, resultado) => {
        if (err) {
            console.error('Error en login:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (resultado.length === 0) {
            return res.status(401).json({ 
                status: 401, 
                message: 'Credenciales inválidas' 
            });
        }

        const usuario = resultado[0];

        try {
            
            const isMatch = await bcrypt.compare(contraseña, usuario.contraseña);

            if (!isMatch) {
                return res.status(401).json({ 
                    status: 401, 
                    message: 'Credenciales inválidas' 
                });
            }

          
            const token = jwt.sign(
                { 
                    id: usuario.id_usuario, 
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol 
                },
                process.env.SECRET_KEY,
                { expiresIn: '8h' }
            );

            res.json({ 
                status: 200, 
                message: 'Inicio de sesión exitoso', 
                token,
                usuario: {
                    id: usuario.id_usuario,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol
                }
            });
        } catch (error) {
            console.error('Error al verificar contraseña:', error);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }
    });
});


router.get('/usuarios', authMiddleware, authRole(['admin']), (req, res) => {
    const sql = 'SELECT id_usuario, nombre, correo, rol, fecha_creacion FROM usuarios';

    pool.query(sql, (err, resultado) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        res.json({ 
            status: 200, 
            message: 'Success', 
            usuarios: resultado 
        });
    });
});


router.get('/usuarios/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    
    
    if (req.user.rol !== 'admin' && req.user.id != id) {
        return res.status(403).json({ 
            status: 403, 
            message: 'No tienes permiso para ver este usuario' 
        });
    }

    const sql = 'SELECT id_usuario, nombre, correo, rol, fecha_creacion FROM usuarios WHERE id_usuario = ?';

    pool.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error('Error al obtener usuario:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (resultado.length === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Usuario no encontrado' 
            });
        }

        res.json({ 
            status: 200, 
            message: 'Success', 
            usuario: resultado[0] 
        });
    });
});


router.put('/usuarios/:id', authMiddleware, async (req, res) => {
    const id = req.params.id;
    const { nombre, correo, contraseña, rol } = req.body;
    
    
    if (req.user.rol !== 'admin' && req.user.id != id) {
        return res.status(403).json({ 
            status: 403, 
            message: 'No tienes permiso para actualizar este usuario' 
        });
    }

    
    if (rol && req.user.rol !== 'admin') {
        return res.status(403).json({ 
            status: 403, 
            message: 'No tienes permiso para cambiar el rol' 
        });
    }

    try {
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

        if (contraseña) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(contraseña, saltRounds);
            updates.push('contraseña = ?');
            values.push(hashedPassword);
        }

        if (rol && ['admin', 'vendedor', 'cliente'].includes(rol)) {
            updates.push('rol = ?');
            values.push(rol);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                status: 400, 
                message: 'No se proporcionaron datos para actualizar' 
            });
        }

        values.push(id);
        const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`;

        pool.query(sql, values, (err, resultado) => {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                return res.status(500).json({ 
                    status: 500, 
                    message: 'Error del servidor' 
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({ 
                    status: 404, 
                    message: 'Usuario no encontrado' 
                });
            }

            res.json({ 
                status: 200, 
                message: 'Usuario actualizado exitosamente' 
            });
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ 
            status: 500, 
            message: 'Error del servidor' 
        });
    }
});


router.delete('/usuarios/:id', authMiddleware, authRole(['admin']), (req, res) => {
    const id = req.params.id;

   
    if (req.user.id == id) {
        return res.status(400).json({ 
            status: 400, 
            message: 'No puedes eliminar tu propia cuenta' 
        });
    }

    const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';

    pool.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error('Error al eliminar usuario:', err);
            return res.status(500).json({ 
                status: 500, 
                message: 'Error del servidor' 
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ 
                status: 404, 
                message: 'Usuario no encontrado' 
            });
        }

        res.json({ 
            status: 200, 
            message: 'Usuario eliminado exitosamente' 
        });
    });
});

module.exports = router;