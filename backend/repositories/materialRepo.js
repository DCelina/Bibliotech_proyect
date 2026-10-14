/**
 * Patrón Repository para los materiales de la biblioteca.
 */
const db = require('../config/db');

class MaterialRepository
{
    async create({ user_id, title, description, subject, original_name, stored_name, mime_type, size_bytes })
    {
        const [rows] = await db.execute(
            'CALL sp_create_material(?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, title, description, subject, original_name, stored_name, mime_type, size_bytes]
        );
        return rows[0][0].insertId;
    }

    // q y subject vacíos ('') significan "sin filtro"
    async findAll({ q = '', subject = '' } = {})
    {
        const [rows] = await db.execute('CALL sp_find_materials(?, ?)', [q, subject]);
        return rows[0];
    }

    async findSubjects()
    {
        const [rows] = await db.execute('CALL sp_find_subjects()');
        return rows[0].map(row => row.subject);
    }

    async findById(id)
    {
        const [rows] = await db.execute('CALL sp_find_material_by_id(?)', [id]);
        return rows[0][0];
    }

    async findByUserId(userId)
    {
        const [rows] = await db.execute('CALL sp_find_materials_by_user(?)', [userId]);
        return rows[0];
    }

    async delete(id)
    {
        const [rows] = await db.execute('CALL sp_delete_material(?)', [id]);
        return rows[0][0].affected > 0;
    }
}

module.exports = new MaterialRepository();
