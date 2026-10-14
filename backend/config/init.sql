-- ==========================================================
-- Biblioteca - esquema para MariaDB (10.4 o superior)
-- Ejecutar como root:  mariadb -u root -p < backend/config/init.sql
-- ATENCIÓN: borra y recrea la base "biblioteca" (uso de desarrollo).
-- ==========================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP DATABASE IF EXISTS biblioteca;
CREATE DATABASE biblioteca CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biblioteca;

-- Usuario de la aplicación con el Principio de Menor Privilegio:
-- SELECT para leer y EXECUTE para invocar los procedimientos almacenados.
-- No puede hacer INSERT, UPDATE ni DELETE directos desde el código.
-- (cambiar la contraseña en producción y mantenerla igual en el .env)
CREATE USER IF NOT EXISTS 'biblioteca'@'localhost' IDENTIFIED BY 'biblioteca';
GRANT SELECT, EXECUTE ON biblioteca.* TO 'biblioteca'@'localhost';

-- 1. Roles (datos maestros)
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- 2. Usuarios (un rol por usuario)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. Materiales de la biblioteca
-- stored_name: nombre del archivo en disco (generado por el servidor, nunca el del cliente)
-- original_name: nombre con el que el usuario lo subió (se usa al descargar)
CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NOT NULL DEFAULT '',
    subject VARCHAR(50) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(100) NOT NULL UNIQUE,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_materials_subject (subject)
);

-- 4. Datos maestros
INSERT INTO roles (name) VALUES ('admin'), ('professor'), ('student');

-- 5. Usuarios de prueba (SOLO DESARROLLO: borrarlos o cambiar sus claves antes de publicar)
--    admin@biblioteca.local      / Admin1234
--    profesor@biblioteca.local   / Profesor1234
--    alumno@biblioteca.local     / Alumno1234
INSERT INTO users (username, email, password, role_id) VALUES
 ('admin',    'admin@biblioteca.local',    '$2b$10$icWWySpsaFu90yJSJYECk.qGhegwKA0GUw7w8YIxJCK641p3fox/e', (SELECT id FROM roles WHERE name = 'admin')),
 ('profesor', 'profesor@biblioteca.local', '$2b$10$MpqWlsBMgzrvSsja15IWmu3ifi5BWrUIKSCGLU8Oz5A8ZSFe1TSJO',  (SELECT id FROM roles WHERE name = 'professor')),
 ('alumno',   'alumno@biblioteca.local',   '$2b$10$t9iSjphsutbger8gRctQveWkuyudT1FYk64EM7pGtIaVBpDRVegKa',   (SELECT id FROM roles WHERE name = 'student'));

-- ==========================================================
-- 6. PROCEDIMIENTOS ALMACENADOS
-- ==========================================================
DELIMITER //

-- --- USUARIOS ---

CREATE PROCEDURE sp_find_user_by_email(IN p_email VARCHAR(254))
BEGIN
    SELECT u.id, u.username, u.email, u.password, u.created_at, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = p_email;
END //

CREATE PROCEDURE sp_find_user_by_id(IN p_id INT)
BEGIN
    SELECT u.id, u.username, u.email, u.created_at, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = p_id;
END //

CREATE PROCEDURE sp_create_user(
    IN p_username VARCHAR(30),
    IN p_email VARCHAR(254),
    IN p_password VARCHAR(255),
    IN p_role_name VARCHAR(20)
)
BEGIN
    DECLARE v_role_id INT DEFAULT NULL;

    SELECT id INTO v_role_id FROM roles WHERE name = p_role_name;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol inexistente';
    END IF;

    INSERT INTO users (username, email, password, role_id)
    VALUES (p_username, p_email, p_password, v_role_id);

    SELECT LAST_INSERT_ID() AS insertId;
END //

CREATE PROCEDURE sp_find_all_users()
BEGIN
    SELECT u.id, u.username, u.email, r.name AS role, u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id;
END //

CREATE PROCEDURE sp_update_user_role(IN p_id INT, IN p_role_name VARCHAR(20))
BEGIN
    DECLARE v_role_id INT DEFAULT NULL;

    SELECT id INTO v_role_id FROM roles WHERE name = p_role_name;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol inexistente';
    END IF;

    UPDATE users SET role_id = v_role_id WHERE id = p_id;
END //

CREATE PROCEDURE sp_delete_user(IN p_id INT)
BEGIN
    DELETE FROM users WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //

-- --- MATERIALES ---

CREATE PROCEDURE sp_create_material(
    IN p_user_id INT,
    IN p_title VARCHAR(150),
    IN p_description VARCHAR(1000),
    IN p_subject VARCHAR(50),
    IN p_original_name VARCHAR(255),
    IN p_stored_name VARCHAR(100),
    IN p_mime_type VARCHAR(120),
    IN p_size_bytes INT UNSIGNED
)
BEGIN
    INSERT INTO materials (user_id, title, description, subject, original_name, stored_name, mime_type, size_bytes)
    VALUES (p_user_id, p_title, p_description, p_subject, p_original_name, p_stored_name, p_mime_type, p_size_bytes);

    SELECT LAST_INSERT_ID() AS insertId;
END //

-- Catálogo con búsqueda opcional por texto (título/descripción) y por materia.
-- Un parámetro vacío ('') significa "sin filtro".
CREATE PROCEDURE sp_find_materials(IN p_q VARCHAR(100), IN p_subject VARCHAR(50))
BEGIN
    SELECT m.id, m.user_id, m.title, m.description, m.subject, m.original_name, m.stored_name,
           m.mime_type, m.size_bytes, m.created_at, u.username AS uploaded_by
    FROM materials m
    JOIN users u ON u.id = m.user_id
    WHERE (p_subject = '' OR m.subject = p_subject)
      AND (p_q = '' OR m.title LIKE CONCAT('%', p_q, '%') OR m.description LIKE CONCAT('%', p_q, '%'))
    ORDER BY m.created_at DESC, m.id DESC;
END //

CREATE PROCEDURE sp_find_subjects()
BEGIN
    SELECT DISTINCT subject FROM materials ORDER BY subject;
END //

CREATE PROCEDURE sp_find_material_by_id(IN p_id INT)
BEGIN
    SELECT m.id, m.user_id, m.title, m.description, m.subject, m.original_name, m.stored_name,
           m.mime_type, m.size_bytes, m.created_at, u.username AS uploaded_by
    FROM materials m
    JOIN users u ON u.id = m.user_id
    WHERE m.id = p_id;
END //

CREATE PROCEDURE sp_find_materials_by_user(IN p_user_id INT)
BEGIN
    SELECT m.id, m.user_id, m.title, m.description, m.subject, m.original_name, m.stored_name,
           m.mime_type, m.size_bytes, m.created_at, u.username AS uploaded_by
    FROM materials m
    JOIN users u ON u.id = m.user_id
    WHERE m.user_id = p_user_id
    ORDER BY m.created_at DESC, m.id DESC;
END //

CREATE PROCEDURE sp_delete_material(IN p_id INT)
BEGIN
    DELETE FROM materials WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //

DELIMITER ;
