-- Elimina la base de datos y el usuario del proyecto (solo para desarrollo)
DROP DATABASE IF EXISTS biblioteca;
DROP USER IF EXISTS 'biblioteca'@'localhost';
SELECT 'Database deleted successfully' AS Status;
