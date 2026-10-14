/**
 * Tipos de archivo que acepta la biblioteca.
 * Para cada MIME se define la extensión con la que se guarda en disco y cómo
 * reconocer su contenido real (firma o "magic number" en los primeros bytes).
 */
const OLE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]); // .doc .xls .ppt
const ZIP = Buffer.from([0x50, 0x4B, 0x03, 0x04]);                         // .docx .xlsx .pptx
const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const JPG = Buffer.from([0xFF, 0xD8, 0xFF]);
const PDF = Buffer.from('%PDF-');

const OOXML = 'application/vnd.openxmlformats-officedocument';

const FILE_TYPES = Object.freeze({
    'application/pdf':                                      { ext: '.pdf',  signatures: [PDF] },
    'application/msword':                                   { ext: '.doc',  signatures: [OLE] },
    [`${OOXML}.wordprocessingml.document`]:                 { ext: '.docx', signatures: [ZIP] },
    'application/vnd.ms-powerpoint':                        { ext: '.ppt',  signatures: [OLE] },
    [`${OOXML}.presentationml.presentation`]:               { ext: '.pptx', signatures: [ZIP] },
    'application/vnd.ms-excel':                             { ext: '.xls',  signatures: [OLE] },
    [`${OOXML}.spreadsheetml.sheet`]:                       { ext: '.xlsx', signatures: [ZIP] },
    'image/png':                                            { ext: '.png',  signatures: [PNG] },
    'image/jpeg':                                           { ext: '.jpg',  signatures: [JPG] },
    // El texto plano no tiene firma: se exige que no tenga bytes nulos (no es binario)
    'text/plain':                                           { ext: '.txt',  isText: true }
});

module.exports = { FILE_TYPES };
