# Cozy Loops E-commerce Backend API

![Node.js](https://img.shields.io/badge/node-v14+-green.svg)
![MongoDB](https://img.shields.io/badge/mongodb-v4+-green.svg)
![Express](https://img.shields.io/badge/express-v5+-lightgrey.svg)

A comprehensive RESTful API backend for the Cozy Loops E-commerce platform, built with Node.js, Express, and MongoDB. This backend provides all essential e-commerce functionality including user management, product catalog, shopping cart, orders, payments, and real-time features.

## 🚀 Technology Stack

### Backend Framework
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Authentication & Security
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### Payment & Email
- **Stripe** - Payment processing
- **Nodemailer** - Email service
- **Gmail SMTP** - Email verification

### Real-time Features
- **Socket.IO** - Real-time bidirectional communication

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server

## 📁 Project Structure

```
ecommerce-backend/
├── 📁 src/
│   ├── 📁 config/                 # Configuration files
│   │   ├── database.js           # MongoDB connection
│   │   └── stripe.js             # Stripe payment config
│   │
│   ├── 📁 controllers/           # Request handlers
│   │   ├── addressController.js  # Address management
│   │   ├── authController.js     # Authentication logic
│   │   ├── cartController.js     # Shopping cart operations
│   │   ├── categoryController.js # Category management
│   │   ├── makerController.js    # Maker/brand management
│   │   ├── orderController.js    # Order processing
│   │   ├── paymentController.js  # Payment handling
│   │   ├── productController.js  # Product management
│   │   ├── reviewController.js   # Product reviews
│   │   └── userController.js     # User management
│   │
│   ├── 📁 middleware/             # Custom middleware
│   │   ├── authMiddleware.js     # JWT authentication
│   │   └── validationMiddleware.js # Input validation
│   │
│   ├── 📁 models/                 # Database schemas
│   │   ├── Cart.js               # Cart model
│   │   ├── Category.js           # Category model
│   │   ├── Maker.js              # Maker/brand model
│   │   ├── Order.js              # Order model
│   │   ├── Product.js            # Product model
│   │   ├── Review.js             # Review model
│   │   ├── User.js               # User model
│   │   ├── Wishlist.js           # Wishlist model
│   │   └── index.js              # Model exports
│   │
│   ├── 📁 routes/                 # API endpoints
│   │   ├── addressRoutes.js      # Address endpoints
│   │   ├── authRoutes.js         # Authentication endpoints
│   │   ├── cartRoutes.js         # Cart endpoints
│   │   ├── categoryRoutes.js     # Category endpoints
│   │   ├── makerRoutes.js        # Maker endpoints
│   │   ├── orderRoutes.js        # Order endpoints
│   │   ├── productRoutes.js      # Product endpoints
│   │   ├── reviewRoutes.js       # Review endpoints
│   │   ├── stripePayment.js      # Stripe payment endpoints
│   │   ├── userRoutes.js         # User endpoints
│   │   └── wishlistRoutes.js     # Wishlist endpoints
│   │
│   ├── 📁 sockets/                # Real-time features
│   │   └── cartSocket.js         # Cart real-time updates
│   │
│   ├── 📁 utils/                  # Utility functions
│   │   ├── emailUtils.js         # Email utilities
│   │   ├── googleAuth.js         # Google OAuth
│   │   ├── jwtUtils.js           # JWT utilities
│   │   ├── otpUtils.js           # OTP generation
│   │   └── otpEmailTemplates.js  # Email templates
│   │
│   └── 📁 validations/            # Input validation
│       ├── authValidation.js     # Auth validation
│       ├── cartValidation.js     # Cart validation
│       ├── categoryValidation.js # Category validation
│       ├── makerValidation.js    # Maker validation
│       ├── productValidation.js  # Product validation
│       └── reviewValidation.js   # Review validation
│
├── 📁 uploads/                    # File uploads directory
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore                    # Git ignore rules
├── index.js                      # Application entry point
├── package.json                  # Dependencies
└── package-lock.json             # Dependency lock file
```

## 🎯 Key Features

### User Management
- **Registration & Login** with email verification
- **Google OAuth** integration
- **Password reset** functionality
- **Profile management** and updates
- **Role-based access** (Admin, User)

### Product Catalog
- **Category management** with hierarchical structure
- **Product CRUD operations** with images
- **Advanced search & filtering**
- **Product variants** (size, color, etc.)
- **Inventory management**

### Shopping Experience
- **Shopping cart** with persistent storage
- **Wishlist** functionality
- **Product reviews & ratings**
- **Real-time cart updates** via Socket.IO

### Order Management
- **Order creation** and tracking
- **Multiple payment methods** (Stripe integration)
- **Order status updates**
- **Order history** for users

### Admin Panel
- **Dashboard analytics**
- **Product management**
- **Order management**
- **User management**
- **Category management**

## 🛠️ Getting Started

### Prerequisites
- **Node.js** v14 or higher
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MohamedAbdEl-Rauof/cozy-loops-ecommerce-platform-backend
   cd ecommerce-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```bash
   # Required variables
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/cozy-loops
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=30d
   FRONTEND_URL=http://localhost:3000
   
   # Email configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Stripe configuration
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🔌 API Endpoints

### Authentication Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### User Routes
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account
- `GET /api/users/addresses` - Get user addresses
- `POST /api/users/addresses` - Add new address
- `PUT /api/users/addresses/:id` - Update address
- `DELETE /api/users/addresses/:id` - Delete address

### Product Routes
- `GET /api/products` - Get all products (with pagination)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `GET /api/products/search` - Search products
- `GET /api/products/category/:categoryId` - Get products by category

### Category Routes
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Cart Routes
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear entire cart

### Order Routes
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (Admin)
- `DELETE /api/orders/:id` - Cancel order

### Payment Routes
- `POST /api/payments/create-payment-intent` - Create Stripe payment
- `POST /api/payments/webhook` - Handle Stripe webhooks
- `GET /api/payments/success/:orderId` - Payment success
- `GET /api/payments/cancel/:orderId` - Payment cancellation

### Review Routes
- `GET /api/reviews/product/:productId` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Wishlist Routes
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist` - Add item to wishlist
- `DELETE /api/wishlist/:productId` - Remove item from wishlist

## 🔐 Authentication & Security

### Authentication Methods
- **Email/Password Authentication** - Traditional registration and login
- **Google OAuth 2.0** - One-click Google sign-in
- **LinkedIn OAuth 2.0** - Professional LinkedIn authentication
- **JWT Token Management** - Secure token-based sessions

### Authentication Flow

#### 1. Email Registration Flow
```
User Registration → Email Verification → Account Activation → Login
```

**Step 1: Registration**
- User provides: name, email, password
- System validates input and checks email uniqueness
- Password is hashed with bcryptjs
- User account created with `isEmailVerified: false`

**Step 2: Email Verification**
- Verification email sent with unique token
- Token expires after 24 hours
- User clicks verification link → `isEmailVerified: true`

**Step 3: Login**
- User provides email and password
- System validates credentials
- JWT access token and refresh token generated
- Tokens returned to client for authenticated requests

#### 2. OAuth Authentication (Google/LinkedIn)
```
OAuth Provider Selection → Authorization → Profile Access → Account Creation/Login
```

**Google OAuth Flow:**
- User clicks "Sign in with Google"
- Redirect to Google consent screen
- User grants permission
- Google returns authorization code
- Backend exchanges code for access token
- User profile fetched from Google API
- Account created or existing user logged in

**LinkedIn OAuth Flow:**
- User clicks "Sign in with LinkedIn"
- Redirect to LinkedIn authorization page
- User grants permission
- LinkedIn returns authorization code
- Backend exchanges code for access token
- Professional profile data retrieved
- Account created or existing user logged in

#### 3. Password Reset Flow
```
Forgot Password Request → OTP Generation → Email Delivery → OTP Verification → Password Reset
```

**Step 1: Password Reset Request**
- User enters registered email
- System generates 6-digit OTP
- OTP stored with 15-minute expiry
- OTP sent to user's email

**Step 2: OTP Verification**
- User receives OTP via email
- User enters OTP in reset form
- System validates OTP and expiry
- Valid OTP → proceed to password reset

**Step 3: Password Reset**
- User enters new password
- Password is hashed and updated
- All existing sessions invalidated
- Confirmation email sent

### Security Features
- **JWT Authentication** with refresh tokens
- **Password hashing** with bcryptjs (salt rounds: 12)
- **Rate limiting** to prevent abuse (100 requests per 15 minutes)
- **Input validation** and sanitization
- **CORS protection** for cross-origin requests
- **Helmet.js** for security headers
- **MongoDB injection protection**
- **HTTPS enforcement** in production
- **OTP encryption** for password reset tokens
- **Email verification tokens** with 24-hour expiry
- **Session management** with token blacklisting

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  role: String, // 'user' | 'admin'
  avatar: String,
  phone: String,
  addresses: [Address],
  isEmailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Product Model
```javascript
{
  name: String,
  description: String,
  price: Number,
  images: [String],
  category: ObjectId,
  maker: ObjectId,
  stock: Number,
  colors: [String],
  sizes: [String],
  slug: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model
```javascript
{
  user: ObjectId,
  items: [OrderItem],
  totalAmount: Number,
  shippingAddress: Address,
  paymentMethod: String,
  paymentStatus: String,
  orderStatus: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Production Environment
1. **Set production environment variables**
2. **Configure MongoDB Atlas**
3. **Set up Stripe webhooks**
4. **Configure email service**
5. **Deploy to hosting platform**

### Docker Deployment
```bash
# Build Docker image
docker build -t cozy-loops-backend .

# Run container
docker run -p 5000:5000 --env-file .env cozy-loops-backend
```

## 🧪 Testing

### Manual Testing
- Use Postman or similar API testing tool
- Test all endpoints with valid and invalid data
- Verify authentication and authorization
- Test payment flows with Stripe test cards

### Available Scripts
```bash
npm start          # Production mode
npm run dev        # Development mode
npm test           # Run tests
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 👥 Authors

- **Mohamed Abd El-Rauof** - Initial work - [MohamedAbdEl-Rauof](https://github.com/MohamedAbdEl-Rauof)

## 🙏 Acknowledgments

- Express.js team for the amazing web framework
- MongoDB team for the flexible NoSQL database
- Stripe for the seamless payment integration
- Socket.IO for real-time communication capabilities
- The open-source community for all the incredible packages
