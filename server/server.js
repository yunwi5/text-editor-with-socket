const mongoose = require('mongoose');
const Document = require('./Document');

mongoose
    .connect('mongodb://localhost:27017/google-docs-clone', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Mongodb connected');
    })
    .catch((e) => {
        console.log('Something went wrong', e);
    });

const io = require('socket.io')(3001, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    socket.on('get-document', async (documentId) => {
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        socket.emit('load-document', document?.data || '');

        socket.on('send-changes', (delta) => {
            console.log(delta);
            // make changes to specific room as broadcast
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        // should be called from the client
        socket.on('save-document', async (data) => {
            // find by documentId, and update data property with shorthand syntax
            await Document.findByIdAndUpdate(documentId, { data });
        });
    });
});

const defaultValue = '';

async function findOrCreateDocument(id) {
    if (id == null) return null;
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue });
}
