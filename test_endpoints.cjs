const fs = require('fs');

async function testEndpoints() {
    try {
        console.log('Testing /generate-text');
        const textRes = await fetch('http://localhost:3000/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'Give me a simple recipe for fried rice' })
        });
        const textData = await textRes.json();
        console.log('Text Response:', textData.output ? textData.output.substring(0, 100) + '...' : textData);
        
        // Let's create dummy files to test image, document, audio
        fs.writeFileSync('dummy.jpg', 'fake image content');
        const formData = new FormData();
        const fileBlob = new Blob([fs.readFileSync('dummy.jpg')]);
        formData.append('image', fileBlob, 'dummy.jpg');
        formData.append('prompt', 'What is in this image?');

        console.log('Testing /generate-from-image');
        const imgRes = await fetch('http://localhost:3000/generate-from-image', {
            method: 'POST',
            body: formData
        });
        const imgData = await imgRes.json();
        console.log('Image Response:', imgData.output ? imgData.output.substring(0, 100) + '...' : imgData);
        
        fs.writeFileSync('dummy.pdf', 'fake document content');
        const formDataDoc = new FormData();
        const docBlob = new Blob([fs.readFileSync('dummy.pdf')]);
        formDataDoc.append('document', docBlob, 'dummy.pdf');
        formDataDoc.append('prompt', 'Summarize this document.');

        console.log('Testing /generate-from-document');
        const docRes = await fetch('http://localhost:3000/generate-from-document', {
            method: 'POST',
            body: formDataDoc
        });
        const docData = await docRes.json();
        console.log('Document Response:', docData.output ? docData.output.substring(0, 100) + '...' : docData);

    } catch(e) {
        console.error('Error testing:', e);
    }
}
testEndpoints();
