require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const eventSessionRoutes = require('./src/routes/eventSessionRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const guestRoutes = require('./src/routes/guestRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const checkinRoutes = require('./src/routes/checkinRoutes');
const photoRoutes = require('./src/routes/photoRoutes');

var app = express();
const PORT = process.env.PORT || 3000;


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: 'http://localhost:3001', // Ganti dengan URL & Port Next.js kamu berjalan
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // SANGAT PENTING: Mengizinkan Frontend mengirim token/cookie
}));


app.get('/', (req, res) => {
    res.json({ msg: "Hadirin API is Running Smoothly! 🚀" });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events/:eventId/sessions', eventSessionRoutes);
app.use('/api/events/:eventId/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events/:eventId/guests', guestRoutes);
app.use('/api/events/:eventId/staff', staffRoutes);
app.use('/api/events/:eventId/checkin', checkinRoutes);
app.use('/api/events/:eventId/photos', photoRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});


app.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`);
});

module.exports = app;
