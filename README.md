# API Token Manager

> SaaS Pricing Calculator for AI API Token Cost Management

A comprehensive web application for AI-powered SaaS companies to calculate operational costs, manage AI API pricing structures, simulate subscription profitability, and optimize pricing strategies based on token consumption.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client
- **Recharts** - Charts and data visualization
- **Lucide React** - Icons

### Backend
- **Node.js 20+** - Runtime environment
- **Express.js** - Web framework
- **MongoDB + Mongoose** - Database and ODM
- **Redis** - Caching and sessions
- **JWT** - Authentication
- **Winston** - Logging
- **Zod** - Validation
- **Nodemailer** - Email services

## 📁 Project Structure

```
api-token-manage/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access layer
│   │   ├── utils/           # Utilities
│   │   ├── validators/      # Request validators
│   │   ├── jobs/            # Background jobs
│   │   ├── types/           # Type definitions
│   │   └── app.js           # Entry point
│   ├── tests/              # Test files
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── ...
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── assets/        # Static assets
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── context/       # React context
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   ├── utils/         # Utilities
│   │   ├── styles/        # CSS styles
│   │   ├── routes/        # Route configuration
│   │   ├── App.jsx        # Main component
│   │   └── main.jsx       # Entry point
│   ├── public/            # Public assets
│   ├── .env.example       # Environment variables template
│   ├── package.json
│   └── ...
│
├── DEVELOPMENT_PLAN.md    # Detailed development plan
├── package.json           # Root package.json
└── README.md             # This file
```

## 🛠️ Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **MongoDB** >= 7.0
- **Redis** >= 7.0 (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd api-token-manage
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (root, backend, frontend)
   npm run install:all

   # Or install separately
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**

   Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   # Run both frontend and backend
   npm run dev

   # Or run separately
   npm run dev:backend  # Backend on port 5000
   npm run dev:frontend # Frontend on port 5173
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/health

## 📜 Available Scripts

### Root Level
| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:backend` | Start backend development server |
| `npm run dev:frontend` | Start frontend development server |
| `npm run build` | Build frontend for production |
| `npm run start` | Start backend in production mode |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all code |
| `npm run format` | Format all code |

### Backend
| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix linting errors |
| `npm run format` | Format code |

### Frontend
| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint code |
| `npm run format` | Format code |
| `npm run test` | Run tests |

## 🔧 Environment Variables

### Backend (.env)
```env
# Application
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/api-token-manager

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Client URL
CLIENT_URL=http://localhost:5173

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME="API Token Manager"
```

## 📖 Documentation

- [Development Plan](./DEVELOPMENT_PLAN.md) - Comprehensive development planning document
- [API Documentation](./backend/README.md) - API endpoints and usage

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run all tests
npm run test
```

## 📦 Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

**UK Valley Projects**

---

Built with ❤️ using the MERN stack