const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/database');
const { initSocket } = require('./src/sockets/cartSocket');
const { requestTimeout } = require('./src/middleware/timeoutMiddleware');

dotenv.config();

connectDB();

const app = express();

const server = http.createServer(app);

initSocket(server);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestTimeout(30000));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
  const contentType = req.get('Content-Type') || 'Not specified';
  
  console.log('\n=== Incoming Request ===');
  console.log(`🕐 Timestamp: ${timestamp}`);
  console.log(`📍 Method: ${req.method}`);
  console.log(`🔗 URL: ${req.originalUrl}`);
  console.log(`🌐 IP Address: ${ip}`);
  console.log(`📱 User Agent: ${userAgent}`);
  console.log(`📋 Content-Type: ${contentType}`);
  
  // Log query parameters if they exist
  if (Object.keys(req.query).length > 0) {
    console.log(`❓ Query Params:`, req.query);
  }
  
  // Log request body for POST/PUT/PATCH requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyToLog = { ...req.body };
    // Hide sensitive fields
    if (bodyToLog.password) bodyToLog.password = '[HIDDEN]';
    if (bodyToLog.confirmPassword) bodyToLog.confirmPassword = '[HIDDEN]';
    if (bodyToLog.token) bodyToLog.token = '[HIDDEN]';
    console.log(`📦 Request Body:`, bodyToLog);
  }
  
  // Log headers (excluding sensitive ones)
  const headersToLog = { ...req.headers };
  if (headersToLog.authorization) headersToLog.authorization = '[HIDDEN]';
  if (headersToLog.cookie) headersToLog.cookie = '[HIDDEN]';
  
  console.log('========================\n');
  
  next();
});

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const makerRoutes = require('./src/routes/makerRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const addressRoutes = require('./src/routes/addressRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const paymentRoutes = require('./src/routes/stripePayment');
const orderRoutes = require('./src/routes/orderRoutes');

app.use('/api/auth', requestTimeout(45000), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/makers', makerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.get('/', (req, res) => {
  res.json({
    message: 'Cozy Loops E-commerce API',
    version: '1.0.0'
  });
});

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
