const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ status: 401, message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ status: 403, message: 'Token inválido o expirado' });
        }

        req.user = decoded;
        next();
    });
};


const authRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return res.status(403).json({ 
                status: 403, 
                message: 'No tienes permiso para acceder a este recurso' 
            });
        }
        next();
    };
};

module.exports = { authMiddleware, authRole };