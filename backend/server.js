/**
 * Proyecto : Biblioteca (derivado de SampleVault - Tecnologías Informáticas B, UNMdP)
 * Licencia : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
 *
 * Punto de entrada: carga el .env, valida la configuración y pone el servidor a escuchar.
 */
require('dotenv').config();

if (!process.env.JWT_SECRET)
{
    console.error('Falta JWT_SECRET en el archivo .env (copiar .env.example a .env y completarlo).');
    process.exit(1);
}

const createApp = require('./app');

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => {
    console.log('==========================================');
    console.log('📚 Biblioteca lista en:');
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Acceso público al catálogo: ${process.env.PUBLIC_ACCESS === 'true' ? 'sí' : 'no'}`);
    console.log('==========================================');
});
