/**
 * Patrón Repository: único lugar que sabe cómo se guardan y leen los usuarios.
 * Los controladores no ven SQL, solo estos métodos (que llaman procedimientos almacenados).
 */
const db = require('../config/db');

class UserRepository
{
    // Devuelve el usuario (con su rol y el hash de la clave) o undefined
    async findByEmail(email)
    {
        const [rows] = await db.execute('CALL sp_find_user_by_email(?)', [email]);
        return rows[0][0];
    }

    // Igual que findByEmail pero sin el hash de la clave
    async findById(id)
    {
        const [rows] = await db.execute('CALL sp_find_user_by_id(?)', [id]);
        return rows[0][0];
    }

    // Crea el usuario y devuelve su id
    async create(username, email, hashedPassword, role)
    {
        const [rows] = await db.execute('CALL sp_create_user(?, ?, ?, ?)', [username, email, hashedPassword, role]);
        return rows[0][0].insertId;
    }

    async findAll()
    {
        const [rows] = await db.execute('CALL sp_find_all_users()');
        return rows[0];
    }

    async updateRole(id, role)
    {
        await db.execute('CALL sp_update_user_role(?, ?)', [id, role]);
        return true;
    }

    // true si borró un usuario; los materiales se borran por ON DELETE CASCADE
    async delete(id)
    {
        const [rows] = await db.execute('CALL sp_delete_user(?)', [id]);
        return rows[0][0].affected > 0;
    }
}

module.exports = new UserRepository();
