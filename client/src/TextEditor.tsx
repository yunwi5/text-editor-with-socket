import React, { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Quill, { TextChangeHandler } from 'quill';
import { useParams } from 'react-router-dom';
import 'quill/dist/quill.snow.css';

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ align: [] }],
    ['image', 'blockquote', 'code-block'],
    ['clean'],
];

const SAVE_INTERVAL_MS = 2000;

const TextEditor: React.FC = () => {
    const { id: documentId } = useParams();
    const [socket, setSocket] = useState<Socket>();
    const [quill, setQuill] = useState<Quill>();

    console.log(documentId);

    useEffect(() => {
        const s = io('http://localhost:3001');
        setSocket(s);

        return () => {
            s.disconnect();
        };
    }, []);

    useEffect(() => {
        if (socket == null || quill == null) return;

        socket.once('load-document', (document) => {
            quill.setContents(document);
            quill.enable();
        });

        socket.emit('get-document', documentId);
    }, [socket, quill, documentId]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        const interval = setInterval(() => {
            socket.emit('save-document', quill.getContents());
        }, SAVE_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [socket, quill]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler: TextChangeHandler = (delta, oldDelta, source) => {
            if (source !== 'user') return;
            socket.emit('send-changes', delta);
        };
        quill.on('text-change', handler);

        return () => {
            quill.off('text-change', handler);
        };
    }, [quill, socket]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler: TextChangeHandler = (delta) => {
            // update document that have the changes that were being
            // made from other client
            quill.updateContents(delta);
        };
        socket.on('receive-changes', handler);

        return () => {
            socket.off('receive-changes', handler);
        };
    }, [quill, socket]);

    const wrapperRef = useCallback((wrapper: any) => {
        if (wrapper == null) return;
        wrapper.innerHTML = '';
        const editor = document.createElement('div');

        wrapper.append(editor);
        const q = new Quill('#container', {
            theme: 'snow',
            modules: {
                toolbar: TOOLBAR_OPTIONS,
            },
        });
        q.disable();
        q.setText('Loading...');
        setQuill(q);
    }, []);

    return <div className="container" id="container" ref={wrapperRef}></div>;
};

export default TextEditor;
