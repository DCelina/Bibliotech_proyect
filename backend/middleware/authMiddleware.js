/**
 * Autenticación (JWT) y autorización por roles.
 *
 * JSON Web Token (RFC 7519): token firmado que lleva el id y el rol del usuario.
 * El servidor lo firma al hacer login y lo verifica en cada pedido con la clave
 * JWT_SECRET, sin guardar sesiones en memoria.
 */
const jwt = require('jsonwebtoken');
const { ROLES, ALL_ROLES } = require('../config/roles');

const ALGORITHM = 'HS256';
const TOKEN_LIFETIME = '2h';

function getSecret()
{
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Falta la variable de entorno JWT_SECRET');
    return secret;
}

// Del header "Authorization: Bearer <token>" devuelve <token>, o null
function extractToken(req)
{
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) return null;
    return header.slice(7).trim() || null;
}

// Si el token es válido deja userId y userRole en req. Devuelve false si no lo es.
function authenticate(req, token)
{
    try
    {
        const decoded = jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
        req.userId = decoded.id;
        req.userRole = decoded.role;
        return true;
    }
    catch
    {
        return false;
    }
}

const authMiddleware = {
    signToken(user)
    {
        return jwt.sign({ id: user.id, role: user.role }, getSecret(), { algorithm: ALGORITHM, expiresIn: TOKEN_LIFETIME });
    },

    // Exige sesión iniciada (cualquier rol)
    verifyToken(req, res, next)
    {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ message: 'Hace falta iniciar sesión.' });
        if (!authenticate(req, token)) return res.status(401).json({ message: 'Sesión inválida o vencida.' });
        next();
    },

    // La sesión es opcional: sin token se continúa como visitante (userRole = null);
    // con un token inválido o vencido se responde 401 para que el cliente vuelva a loguearse.
    optionalToken(req, res, next)
    {
        const token = extractToken(req);
        req.userId = null;
        req.userRole = null;
        if (token && !authenticate(req, token)) return res.status(401).json({ message: 'Sesión inválida o vencida.' });
        next();
    },

    // Exige que el rol del token sea uno de los indicados. Va DESPUÉS de verifyToken.
    requireRole(...allowed)
    {
        return (req, res, next) => {
            if (!allowed.includes(req.userRole))
            {
                return res.status(403).json({ message: 'No tenés permisos para realizar esta acción.' });
            }
            next();
        };
    },

    // Acceso de lectura al catálogo: público si PUBLIC_ACCESS=true; si no, cualquier rol con sesión
    readAccess(req, res, next)
    {
        if (process.env.PUBLIC_ACCESS === 'true') return authMiddleware.optionalToken(req, res, next);
        authMiddleware.verifyToken(req, res, () => authMiddleware.requireRole(...ALL_ROLES)(req, res, next));
    }
};

authMiddleware.isAdmin = authMiddleware.requireRole(ROLES.ADMIN);
authMiddleware.canUpload = authMiddleware.requireRole(ROLES.PROFESSOR, ROLES.ADMIN);

module.exports = authMiddleware;
