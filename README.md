# Warehouse Management System

A modern, full-featured warehouse management web application built with React, Node.js, Express, and SQLite.

## Features
- 📦 Inventory Management
- 📋 Order Processing (Sales & Purchase Orders)
- 👥 Customer & Supplier Management
- 📊 Analytics Dashboard with Charts
- 🤖 AI Chat Assistant
- 📱 Barcode Scanning
- 📈 Forecasting & Analytics
- 🏪 Multi-location Support
- 📧 Email Notifications
- 📄 Export/Import (CSV, PDF)
- 🔐 Authentication & Role-based Access
- 📝 Audit Logging

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Clone or download this project
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ..
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```
   Backend will run on http://localhost:4000

2. In a new terminal, start the frontend:
   ```bash
   npm run dev
   ```
   Frontend will run on http://localhost:5173 (or next available port)

3. Open your browser and go to the frontend URL

### Default Login
- Username: `admin`
- Password: `admin123`
- Role: `admin`

### Demo Data
The system will automatically create demo data including:
- Sample products
- Test customers and suppliers
- Example orders
- Audit logs

### Testing the AI Assistant
1. Click the "🤖 AI Assistant" tab
2. Try commands like:
   - "Show low stock items"
   - "Inventory summary"
   - "Recent orders"
   - "Analytics"
   - "Help"

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Charts**: Chart.js
- **Barcode**: Quagga.js
- **PDF**: jsPDF
- **Styling**: Custom CSS

## Project Structure
```
warehouse-inventoty/
├── src/
│   ├── App.jsx          # Main React application
│   ├── App.css          # Styling
│   └── main.jsx         # Entry point
├── backend/
│   ├── index.js         # Express server
│   ├── warehouse.db     # SQLite database
│   └── package.json     # Backend dependencies
├── package.json         # Frontend dependencies
└── README.md           # This file
```

## API Endpoints
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- And many more...

## Contributing
Feel free to submit issues and enhancement requests!

## License
MIT License

### Backend
_Backend setup instructions will be added after backend scaffolding._

---

For workspace-specific Copilot instructions, see `.github/copilot-instructions.md`.
