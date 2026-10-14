const { Filter } = require('./Filter');
const { FILE_TYPES } = require('./fileTypes');

/**
 * Verifica que el CONTENIDO del archivo (primeros bytes) corresponda al tipo MIME
 * declarado. El MIME lo informa el cliente y se puede falsificar; la firma no.
 * evaluate() recibe un Buffer con el inicio del archivo.
 */
class FileSignatureFilter extends Filter {
    constructor(mimeType, field = 'file') {
        super(field, 'file.signatureMismatch');
        this.type = FILE_TYPES[mimeType];
    }

    evaluate(head) {
        if (!this.type || !Buffer.isBuffer(head) || head.length === 0) return false;
        if (this.type.isText) return !head.includes(0x00);
        return this.type.signatures.some(sig => head.length >= sig.length && head.subarray(0, sig.length).equals(sig));
    }
}

module.exports = FileSignatureFilter;
