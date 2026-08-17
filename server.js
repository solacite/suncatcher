const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('lalala');
});

app.listen(3000, () => {
    console.log('server running @ localhost port 3000! awesome');
});