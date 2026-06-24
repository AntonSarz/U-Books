const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const upload = require('../middlewares/upload');

// GET /api/anuncios -> todos los anuncios disponibles (para el catalogo)
router.get('/', async (req, res) =>{
    try{
        // Obtener los anuncios de la base de datos 
        const [anuncios] = await db.query(`SELECT a.id_anuncio, a.titulo, a.autor, a.edicion, a.condicion, 
            a.disponible, a.foto_url, a.fecha, u.telefono, a.id_materia, m.nombre AS materia 
        FROM anuncios a 
        JOIN materias m ON a.id_materia = m.id_materia 
        JOIN usuarios u ON a.id_usuario = u.id_usuario
        WHERE a.borrado = 0 AND a.disponible = 1
        ORDER BY a.fecha DESC
        `);
    res.json(anuncios);
            
    } catch(error){
        console.error('Error al obtener anuncios:', error);
        res.status(500).json({ error: 'Error al obtener los anuncios.' });
    }
});

// GET /api/anuncios/usuario/:id_usuario -> anuncios de un usuario en especifico (para el perfil)
router.get('/usuario/:id_usuario', async (req, res) => {
    try{
        // Obtener los anuncios de la base de datos
        const [anuncios] = await db.query(`SELECT a.id_anuncio, a.titulo, a.autor, a.edicion, a.condicion, 
            a.disponible, a.foto_url, a.fecha, a.id_materia, m.nombre AS materia
            FROM anuncios a
            JOIN materias m ON a.id_materia = m.id_materia
            WHERE a.id_usuario = ? AND a.borrado = 0
            ORDER BY a.fecha DESC
            `, [req.params.id_usuario]);
            res.json(anuncios);
    
        } catch(error){
            console.error('Error al obtener anuncios del usuario:', error);
            res.status(500).json({ error: 'Error al obtener los anuncios.'});
    }
});

// POST /api/anuncios -> crear anuncio (recibe el form-data con la imagen)
router.post('/', upload.single('foto'), async (req, res) => {
    const { id_usuario, titulo, autor, id_materia, edicion, condicion } = req.body;

    // Validar que se hayan proporcionado los campos necesarios
    if (!id_usuario || !titulo || !autor || !id_materia || !req.file) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o la foto del libro.' });
    }

    // Guardar la imagen dentro del servidor 
    const foto_url = `/uploads/${req.file.filename}`;

    // Insertar el nuevo anuncio en la base de datos
    try {
        const [resultado] = await db.query(
            `INSERT INTO anuncios (id_usuario, titulo, autor, id_materia, edicion, condicion, foto_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_usuario, titulo, autor, id_materia, edicion || null, condicion === 'Nuevo' ? 1 : 0, foto_url]
        );
        res.status(201).json({ mensaje: 'Anuncio publicado correctamente.', id_anuncio: resultado.insertId });
    
    } catch (error) {
        console.error('Error al crear anuncio:', error);
        res.status(500).json({ error: 'Error al publicar el anuncio.' });
    }
});

// PUT /api/anuncios/:id -> editar anuncio (con o sin nueva foto)
router.put('/:id', upload.single('foto'), async (req, res) => {
    const { titulo, autor, id_materia, edicion, condicion } = req.body;
    const { id } = req.params;

    // Validar que se hayan proporcionado los campos necesarios
    if (!titulo || !autor || !id_materia) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        if (req.file) {
           // Si subieron una foto nueva, tambien se actualizara foto_url
            const foto_url = `/uploads/${req.file.filename}`;
            await db.query(
                `UPDATE anuncios SET titulo=?, autor=?, id_materia=?, edicion=?, condicion=?, foto_url=? 
                WHERE id_anuncio=?`,
                [titulo, autor, id_materia, edicion || null, condicion === 'Nuevo' ? 1 : 0, foto_url, id]
            );
        } else {
             // Si el usuario no subio una foto nueva (se conserva la anterior)
            await db.query(
                `UPDATE anuncios SET titulo=?, autor=?, id_materia=?, edicion=?, condicion=?
                WHERE id_anuncio=?`,
                [titulo, autor, id_materia, edicion || null, condicion === 'Nuevo' ? 1 : 0, id]
            );
        }

        res.json({ mensaje: 'Anuncio editado correctamente.' });

    } catch (error) {
        console.error('Error al actualizar anuncio:', error);
        res.status(500).json({ error: 'Error al actualizar el anuncio.' });
    }
});

// PATCH /api/anuncios/:id/disponibilidad -> el toggle de disponible o vendido
router.patch('/:id/disponibilidad', async (req, res) => {
    const { disponible } = req.body //true o false

    try {
        await db.query('UPDATE anuncios SET disponible = ? WHERE id_anuncio = ?', [disponible ? 1 : 0, req.params.id]);
        res.json({ mensaje: 'Disponibilidad actualizada.' });
    } catch (error) {
        console.error('Error al actualizar disponibilidad:', error);
        res.status(500).json({ error: 'Error al actualizar la disponibilidad.' });
    }
});

// DELETE /api/anuncios/:id -> borrado logico
router.delete('/:id', async (req, res) => {
    try {
        await db.query('UPDATE anuncios SET borrado = 1 WHERE id_anuncio = ?', [req.params.id]);
        res.json({ mensaje: 'Anuncio borrado.' });
    } catch (error) {
        console.error('Error al eliminar anuncio:', error);
        res.status(500).json({ error: 'Error al eliminar el anuncio.' });
    }
});

module.exports = router;