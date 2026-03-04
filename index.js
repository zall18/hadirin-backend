const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Wajib
app.use(cors());
app.use(express.json()); // Pengganti body-parser

// Cek Server
app.get('/', (req, res) => {
    res.json({ msg: "Hadirin API is Running Smoothly! 🚀" });
});

// Import Routes (Nanti kita tambahkan Auth & Event di sini)
// app.use('/api/auth', require('./src/routes/authRoutes'));

app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});