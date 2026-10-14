/**
 * Materiales de la biblioteca: consultar, descargar, subir y borrar.
 */
const materialRepo = require('../repositories/materialRepo');
const fileHelper = require('../utils/fileHelper');
const parseId = require('../utils/parseId');
const { FileSignatureFilter } = require('../filters');
const { ROLES } = require('../config/roles');

// Lo que se le muestra al cliente (nunca stored_name: es un detalle interno)
function toDTO(m)
{
    return {
        id: m.id,
        title: m.title,
        description: m.description,
        subject: m.subject,
        original_name: m.original_name,
        mime_type: m.mime_type,
        size_bytes: m.size_bytes,
        uploaded_by: m.uploaded_by,
        uploaded_by_id: m.user_id,
        created_at: m.created_at
    };
}

// Un query param puede llegar como string o como array (?q=a&q=b): solo se acepta string
const queryText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Nombre original seguro para mostrar y para el header de descarga
function cleanOriginalName(name, fallback)
{
    const cleaned = String(name ?? '').replace(/[\x00-\x1f\x7f\\/]/g, '').trim().slice(0, 255);
    return cleaned || fallback;
}

class MaterialController
{
    async list(req, res)
    {
        const materials = await materialRepo.findAll({
            q: queryText(req.query.q, 100),
            subject: queryText(req.query.subject, 50)
        });
        res.json(materials.map(toDTO));
    }

    async subjects(req, res)
    {
        res.json(await materialRepo.findSubjects());
    }

    // Materiales del usuario logueado (un Professor ve los suyos)
    async mine(req, res)
    {
        const materials = await materialRepo.findByUserId(req.userId);
        res.json(materials.map(toDTO));
    }

    // Todos: necesita readAccess
    async getOne(req, res)
    {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ message: 'Id inválido.' });

        const material = await materialRepo.findById(id);
        if (!material) return res.status(404).json({ message: 'El material no existe.' });
        res.json(toDTO(material));
    }

    async download(req, res)
    {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ message: 'Id inválido.' });

        const material = await materialRepo.findById(id);
        if (!material) return res.status(404).json({ message: 'El material no existe.' });

        // El archivo se entrega siempre como descarga ("attachment"), nunca para abrirse en el navegador
        res.download(fileHelper.resolve(material.stored_name), material.original_name, (err) => {
            if (err && !res.headersSent)
            {
                res.status(err.code === 'ENOENT' ? 404 : 500).json({ message: 'No se pudo entregar el archivo.' });
            }
        });
    }

    async upload(req, res)
    {
        if (!req.file) return res.status(400).json({ message: 'Falta el archivo (campo "file").' });

        const stored_name = req.file.filename;
        const discard = async (status, message) => {
            await fileHelper.deleteFile(stored_name); // no dejar basura en el disco
            return res.status(status).json({ message });
        };

        try
        {
            // Reglas de negocio sobre los metadatos
            const title = queryText(req.body?.title, 150);
            const subject = queryText(req.body?.subject, 50);
            const description = queryText(req.body?.description, 1000);
            if (!title || !subject) return discard(400, 'El título y la materia son obligatorios.');

            // El MIME lo declara el cliente; la firma del contenido confirma que sea cierto
            const signature = new FileSignatureFilter(req.file.mimetype);
            if (!signature.evaluate(await fileHelper.readHead(stored_name)))
            {
                return discard(415, 'El contenido del archivo no coincide con su tipo.');
            }

            const id = await materialRepo.create({
                user_id: req.userId,
                title,
                description,
                subject,
                original_name: cleanOriginalName(req.file.originalname, stored_name),
                stored_name,
                mime_type: req.file.mimetype,
                size_bytes: req.file.size
            });

            res.status(201).json({ message: 'Material publicado en la biblioteca.', id });
        }
        catch (error)
        {
            await fileHelper.deleteFile(stored_name);
            throw error;
        }
    }

    // Professor: solo los suyos. Admin: cualquiera.
    async remove(req, res)
    {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ message: 'Id inválido.' });

        const material = await materialRepo.findById(id);
        if (!material) return res.status(404).json({ message: 'El material no existe.' });

        if (req.userRole !== ROLES.ADMIN && material.user_id !== req.userId)
        {
            return res.status(403).json({ message: 'Solo podés borrar tus propios materiales.' });
        }

        await materialRepo.delete(id);
        await fileHelper.deleteFile(material.stored_name);
        res.json({ message: 'Material eliminado.' });
    }
}

module.exports = new MaterialController();
