# Cozy Loops E-commerce Backend

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v14+-green.svg)
![MongoDB](https://img.shields.io/badge/mongodb-v4+-green.svg)

Backend API for the Cozy Loops E-commerce platform built with Node.js, Express, and MongoDB.

## Features

- RESTful API architecture
- JWT-based authentication and authorization
- Role-based access control
- MongoDB with Mongoose ODM
- Real-time notifications with Socket.IO
- Secure API endpoints with rate limiting
- Comprehensive error handling
- Input validation and sanitization
- Nodemailer for Email Verification Service

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/MohamedAbdEl-Rauof/cozy-loops-ecommerce-platform-backend
   cd ecommerce-backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create environment variables
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration (see Environment Variables section)

5. Start the development server
   ```bash
   npm run dev
   ```

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Custom middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── sockets/             # Socket.io handlers
│   ├── utils/               # Utility functions
│   └── validations/         # Input validation schemas
├── uploads/                 # File uploads (if not using cloud storage)
├── .env                     # Environment variables (not committed)
├── .env.example             # Example environment variables            
├── .eslintrc                # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore file
├── index.js                 # Entry point
└── package.json             # Project dependencies
```

## Database Design

The database schema can be viewed in this [Entity Relationship Diagram](https://dbdiagram.io/d/685053bf3cc77757c815dcfc).

## API Documentation

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get access token
- `POST /api/users/logout` - Logout and invalidate token
- `POST /api/users/refresh-token` - Get new access token using refresh token

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
- `GET /api/products/category/:categoryId` - Get products by category

### Orders

- `GET /api/orders` - Get all orders (admin only)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (admin only)
- `GET /api/orders/user` - Get current user's orders

### Reviews

- `GET /api/reviews/product/:productId` - Get reviews for a product
- `POST /api/reviews` - Create new review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Cart

- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secure_random_string
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=30
```

⚠️ **Security Note:**
- Never commit your `.env` file to version control
- Use strong, unique values for secrets
- In production, use environment variables from your hosting platform
- Rotate JWT secrets periodically

## Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Security Features

- HTTPS enforcement in production
- Helmet.js for security headers
- CORS protection
- Rate limiting to prevent brute force attacks
- Input validation and sanitization
- JWT with expiration
- Password hashing with bcrypt
- MongoDB injection protection

## Deployment

### Prerequisites
- Node.js hosting environment (Heroku, AWS, DigitalOcean, etc.)
- MongoDB Atlas account (or other MongoDB hosting)
- Environment variables configured on hosting platform

### Steps
1. Set up MongoDB Atlas cluster
2. Configure environment variables on hosting platform
3. Deploy code to hosting platform
4. Ensure proper CORS configuration for production frontend URL

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate tests.


## Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- [JWT](https://jwt.io/) - Authentication
- [Socket.IO](https://socket.io/) - Real-time communication
```

Improvements made:

1. **Added badges** at the top for quick information
2. **Enhanced feature list** with more specific details
3. **Improved security guidance** for environment variables
4. **Added a dedicated Security Features section** to highlight security measures
5. **Added a Deployment section** with guidance for production deployment
6. **Improved formatting and organization** throughout
7. **Added more context to acknowledgments** to explain what each technology is used for
8. **Added warning emoji** for security notes to draw attention
9. **Clarified contributing guidelines** with additional information
10. **Noted that .env files should not be committed** in the project structure