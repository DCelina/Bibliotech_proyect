/**
 * Registro e inicio de sesión.
 * Los filtros (formato de email, contraseña, usuario) se aplican con FilterHandler;
 * las reglas de negocio (rol inicial, duplicados) se resuelven acá.
 */
const bcrypt = require('bcrypt');
const userRepo = require('../repositories/userRepo');
const { signToken } = require('../middleware/authMiddleware');
const { FilterHandler, EmailFilter, PasswordFilter, UsernameFilter } = require('../filters');
const { ROLES } = require('../config/roles');

// Hash de relleno: se compara contra él cuando el email no existe, para que
// responder "usuario inexistente" tarde lo mismo que responder "clave incorrecta".
const DUMMY_HASH = bcrypt.hashSync('relleno-contra-ataques-de-tiempo', 10);

const trimmed = (v) => (typeof v === 'string' ? v.trim() : v);
const normalizedEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

class AuthController
{
    async register(req, res)
    {
        const body = req.body ?? {};
        const data = {
            username: trimmed(body.username),
            email: normalizedEmail(body.email),
            password: body.password
        };

        const result = new FilterHandler(req.lang)
            .with(new UsernameFilter())
            .with(new EmailFilter())
            .with(new PasswordFilter())
            .filterThis(data);

        if (!result.valid)
        {
            return res.status(400).json({ message: result.errors[0].message, errors: result.errors });
        }

        try
        {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            // El rol NO se toma del pedido: todo registro público es Student.
            // Solo un Admin puede promover a alguien a Professor o Admin.
            const userId = await userRepo.create(data.username, data.email, hashedPassword, ROLES.STUDENT);
            res.status(201).json({ message: 'Usuario registrado con éxito.', userId });
        }
        catch (error)
        {
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)
            {
                return res.status(409).json({ message: 'El usuario o el email ya están en uso.' });
            }
            throw error; // lo atiende el manejador global (500 sin filtrar detalles)
        }
    }

    async login(req, res)
    {
        const body = req.body ?? {};
        const email = normalizedEmail(body.email);
        const password = body.password;

        if (typeof password !== 'string' || !password)
        {
            return res.status(400).json({ message: 'Credenciales incompletas.' });
        }

        const result = new FilterHandler(req.lang).with(new EmailFilter()).filterThis({ email });
        if (!result.valid)
        {
            return res.status(400).json({ message: result.errors[0].message, errors: result.errors });
        }

        const user = await userRepo.findByEmail(email);
        const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

        if (!user || !passwordOk)
        {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        res.json({
            message: 'Login exitoso.',
            token: signToken(user),
            role: user.role,
            username: user.username
        });
    }
}

module.exports = new AuthController();
