/**
 * Acciones exclusivas del rol Admin sobre los usuarios.
 */
const userRepo = require('../repositories/userRepo');
const materialRepo = require('../repositories/materialRepo');
const fileHelper = require('../utils/fileHelper');
const parseId = require('../utils/parseId');
const { ALL_ROLES } = require('../config/roles');

class AdminController
{
    async getAllUsers(req, res)
    {
        res.json(await userRepo.findAll());
    }

    async updateRole(req, res)
    {
        const id = parseId(req.params.id);
        const role = req.body?.role;

        if (!id) return res.status(400).json({ message: 'Id inválido.' });
        if (!ALL_ROLES.includes(role)) return res.status(400).json({ message: `Rol inválido. Opciones: ${ALL_ROLES.join(', ')}.` });

        // Regla de negocio: un admin no puede cambiarse su propio rol (evita quedarse sin admins)
        if (id === req.userId) return res.status(403).json({ message: 'No podés cambiar tu propio rol.' });

        if (!(await userRepo.findById(id))) return res.status(404).json({ message: 'Usuario no encontrado.' });

        await userRepo.updateRole(id, role);
        res.json({ message: 'Rol actualizado.' });
    }

    async deleteUser(req, res)
    {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ message: 'Id inválido.' });

        if (id === req.userId)
        {
            return res.status(403).json({ message: 'No podés eliminar tu propia cuenta de administrador.' });
        }

        if (!(await userRepo.findById(id))) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Se listan los materiales antes de borrar: la base los elimina en cascada,
        // pero los archivos físicos hay que sacarlos del disco a mano.
        const materials = await materialRepo.findByUserId(id);
        await userRepo.delete(id);
        await Promise.all(materials.map(m => fileHelper.deleteFile(m.stored_name)));

        res.json({ message: `Usuario eliminado. Se removieron ${materials.length} archivos.` });
    }
}

module.exports = new AdminController();
