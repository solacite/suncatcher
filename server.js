require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.static('public'));

app.listen(3000, () => {
    console.log('server running @ localhost port 3000! awesome');
});
