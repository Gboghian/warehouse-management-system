import { useState, useEffect, useRef } from 'react';
import './App.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Quagga from 'quagga';

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const DEMO_MODE = !API_URL.includes('localhost') || import.meta.env.VITE_DEMO_MODE === 'true';

function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', role: 'user' });
  const [tab, setTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: '' });
  const [editProduct, setEditProduct] = useState(null);
  const [newOrder, setNewOrder] = useState({ product_id: '', quantity: '' });
  const [editOrder, setEditOrder] = useState(null);
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 10;

  // Advanced features state
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_email: '', contact_phone: '', address: '' });

  // Customer management state
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', 
    zip_code: '', country: '', customer_type: 'regular', credit_limit: '', payment_terms: 'net_30'
  });
  const [editCustomer, setEditCustomer] = useState(null);
  const [newSalesOrder, setNewSalesOrder] = useState({
    customer_id: '', expected_delivery: '', notes: '', items: []
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // AI Chat Assistant state
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'bot', content: 'Hello! I\'m your AI Warehouse Assistant. I can help you with inventory management, orders, analytics, and more. Try asking me: "Show low stock items" or "Create order for customer ABC"' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Fetch products
  const fetchProducts = () => {
    setLoading(true);
    
    if (DEMO_MODE) {
      // Demo data
      setTimeout(() => {
        const demoProducts = [
          { id: 1, name: 'Laptop Computer', quantity: 25, price: 999.99, category: 'Electronics' },
          { id: 2, name: 'Office Chair', quantity: 8, category: 'Furniture' },
          { id: 3, name: 'Wireless Mouse', quantity: 45, category: 'Electronics' },
          { id: 4, name: 'Desk Lamp', quantity: 12, category: 'Furniture' },
          { id: 5, name: 'USB Cable', quantity: 5, category: 'Electronics' }, // Low stock
          { id: 6, name: 'Monitor Stand', quantity: 15, category: 'Accessories' },
          { id: 7, name: 'Keyboard', quantity: 3, category: 'Electronics' }, // Low stock
        ];
        setProducts(demoProducts);
        const map = {};
        demoProducts.forEach(p => { map[p.id] = p.name; });
        setProductMap(map);
        setLoading(false);
      }, 500);
      return;
    }
    
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        const map = {};
        data.forEach(p => { map[p.id] = p.name; });
        setProductMap(map);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load products'); setLoading(false); });
  };

  // Fetch orders
  const fetchOrders = () => {
    setLoading(true);
    
    if (DEMO_MODE) {
      setTimeout(() => {
        const demoOrders = [
          { id: 1, product_id: 1, quantity: 2, created_at: '2025-06-26T10:00:00Z' },
          { id: 2, product_id: 3, quantity: 10, created_at: '2025-06-26T09:30:00Z' },
          { id: 3, product_id: 2, quantity: 1, created_at: '2025-06-25T14:20:00Z' },
          { id: 4, product_id: 4, quantity: 3, created_at: '2025-06-25T11:15:00Z' },
        ];
        setOrders(demoOrders);
        setLoading(false);
      }, 500);
      return;
    }
    
    fetch(`${API_URL}/api/orders`)
      .then(res => res.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => { setError('Failed to load orders'); setLoading(false); });
  };

  // Fetch advanced data
  const fetchSuppliers = () => {
    fetch('${API_URL}/api/suppliers')
      .then(res => res.json())
      .then(setSuppliers);
  };

  const fetchPurchaseOrders = () => {
    fetch('${API_URL}/api/purchase-orders')
      .then(res => res.json())
      .then(setPurchaseOrders);
  };

  const fetchLowStockAlerts = () => {
    fetch('${API_URL}/api/low-stock-alerts')
      .then(res => res.json())
      .then(setLowStockAlerts);
  };

  const fetchCustomers = () => {
    if (DEMO_MODE) {
      setTimeout(() => {
        const demoCustomers = [
          { id: 1, name: 'Acme Corp', email: 'contact@acme.com', phone: '555-0123', address: '123 Business Ave', city: 'New York', state: 'NY', customer_type: 'business' },
          { id: 2, name: 'Tech Solutions Inc', email: 'info@techsol.com', phone: '555-0456', address: '456 Innovation Blvd', city: 'San Francisco', state: 'CA', customer_type: 'business' },
          { id: 3, name: 'Global Enterprises', email: 'sales@global.com', phone: '555-0789', address: '789 Commerce St', city: 'Chicago', state: 'IL', customer_type: 'enterprise' },
        ];
        setCustomers(demoCustomers);
      }, 500);
      return;
    }
    
    fetch(`${API_URL}/api/customers`)
      .then(res => res.json())
      .then(setCustomers)
      .catch(() => setError('Failed to load customers'));
  };

  const fetchSalesOrders = () => {
    fetch('${API_URL}/api/sales-orders')
      .then(res => res.json())
      .then(setSalesOrders)
      .catch(() => setError('Failed to load sales orders'));
  };

  useEffect(() => { fetchProducts(); fetchOrders(); }, []);
  useEffect(() => {
    if (token) {
      fetchSuppliers();
      fetchPurchaseOrders();
      fetchLowStockAlerts();
      fetchCustomers();
      fetchSalesOrders();
    }
  }, [token]);

  // Supplier management functions
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setError('');
    if (!newSupplier.name) return;
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/suppliers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(newSupplier)
      });
      if (!res.ok) throw new Error('Failed to add supplier');
      await fetchSuppliers();
      setNewSupplier({ name: '', contact_email: '', contact_phone: '', address: '' });
    } catch (err) {
      setError('Failed to add supplier: ' + err.message);
    }
    setLoading(false);
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    if (!newProduct.name || !newProduct.quantity) return;
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, quantity: Number(newProduct.quantity) })
      });
      if (!res.ok) throw new Error('Add failed');
      await fetchProducts();
      setNewProduct({ name: '', quantity: '' });
    } catch {
      setError('Failed to add product');
    }
    setLoading(false);
  };

  // Edit product
  const handleEditProduct = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProduct)
      });
      if (!res.ok) throw new Error('Edit failed');
      await fetchProducts();
      setEditProduct(null);
    } catch {
      setError('Failed to edit product');
    }
    setLoading(false);
  };

  // Delete product
  const handleDeleteProduct = async (id) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchProducts();
    } catch {
      setError('Failed to delete product');
    }
    setLoading(false);
  };

  // Add order
  const handleAddOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (!newOrder.product_id || !newOrder.quantity) return;
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: Number(newOrder.product_id), quantity: Number(newOrder.quantity) })
      });
      if (!res.ok) throw new Error('Add failed');
      await fetchOrders();
      await fetchProducts();
      setNewOrder({ product_id: '', quantity: '' });
    } catch {
      setError('Failed to add order');
    }
    setLoading(false);
  };

  // Edit order
  const handleEditOrder = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${editOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrder)
      });
      if (!res.ok) throw new Error('Edit failed');
      await fetchOrders();
      setEditOrder(null);
    } catch {
      setError('Failed to edit order');
    }
    setLoading(false);
  };

  // Delete order
  const handleDeleteOrder = async (id) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchOrders();
    } catch {
      setError('Failed to delete order');
    }
    setLoading(false);
  };

  // Customer management functions
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCustomer.name) return;
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/customers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(newCustomer)
      });
      if (!res.ok) throw new Error('Failed to add customer');
      await fetchCustomers();
      setNewCustomer({
        name: '', email: '', phone: '', address: '', city: '', state: '', 
        zip_code: '', country: '', customer_type: 'regular', credit_limit: '', payment_terms: 'net_30'
      });
    } catch (err) {
      setError('Failed to add customer: ' + err.message);
    }
    setLoading(false);
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customers/${editCustomer.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(editCustomer)
      });
      if (!res.ok) throw new Error('Failed to edit customer');
      await fetchCustomers();
      setEditCustomer(null);
    } catch (err) {
      setError('Failed to edit customer: ' + err.message);
    }
    setLoading(false);
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customers/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : undefined }
      });
      if (!res.ok) throw new Error('Failed to delete customer');
      await fetchCustomers();
    } catch (err) {
      setError('Failed to delete customer: ' + err.message);
    }
    setLoading(false);
  };

  const handleCreateSalesOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (!newSalesOrder.customer_id || newSalesOrder.items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('${API_URL}/api/sales-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(newSalesOrder)
      });
      if (!res.ok) throw new Error('Failed to create sales order');
      await fetchSalesOrders();
      await fetchProducts(); // Refresh products to show updated quantities
      setNewSalesOrder({ customer_id: '', expected_delivery: '', notes: '', items: [] });
      setShowOrderForm(false);
    } catch (err) {
      setError('Failed to create sales order: ' + err.message);
    }
    setLoading(false);
  };

  // Auth handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Demo mode authentication
    if (DEMO_MODE) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        if (authMode === 'login') {
          // Demo credentials
          if (authForm.username === 'admin' && authForm.password === 'admin') {
            setToken('demo-token');
            setRole('admin');
            localStorage.setItem('token', 'demo-token');
            localStorage.setItem('role', 'admin');
          } else if (authForm.username === 'demo' && authForm.password === 'demo') {
            setToken('demo-token');
            setRole('user');
            localStorage.setItem('token', 'demo-token');
            localStorage.setItem('role', 'user');
          } else {
            throw new Error('Invalid credentials. Use admin/admin or demo/demo');
          }
        } else {
          // Demo registration
          setAuthMode('login');
          setError('Demo account created! Now login with admin/admin');
        }
        setAuthForm({ username: '', password: '', role: 'user' });
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
      return;
    }
    
    // Original backend authentication
    try {
      const res = await fetch(`${API_URL}/api/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      if (authMode === 'login') {
        setToken(data.token);
        setRole(data.role);
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
      } else {
        setAuthMode('login');
      }
      setAuthForm({ username: '', password: '', role: 'user' });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    setRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  // AI Chat Assistant functions
  const processAICommand = async (userInput) => {
    const input = userInput.toLowerCase().trim();
    
    // Show low stock items
    if (input.includes('low stock') || input.includes('restock')) {
      const lowStock = products.filter(p => p.quantity < 10);
      if (lowStock.length === 0) {
        return 'Great news! No items are currently low in stock.';
      }
      return `Found ${lowStock.length} items with low stock:\n${lowStock.map(p => 
        `• ${p.name}: ${p.quantity} units remaining`
      ).join('\n')}`;
    }
    
    // Show inventory summary
    if (input.includes('inventory') || input.includes('stock summary')) {
      const totalItems = products.length;
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      const lowStockCount = products.filter(p => p.quantity < 10).length;
      return `📦 Inventory Summary:\n• Total Items: ${totalItems}\n• Total Quantity: ${totalQuantity} units\n• Low Stock Items: ${lowStockCount}`;
    }
    
    // Show recent orders
    if (input.includes('recent orders') || input.includes('today orders')) {
      const recentOrders = orders.slice(-5);
      if (recentOrders.length === 0) {
        return 'No recent orders found.';
      }
      return `📋 Recent Orders:\n${recentOrders.map(order => 
        `• Order #${order.id}: ${order.quantity} units of ${productMap[order.product_id] || 'Unknown Product'}`
      ).join('\n')}`;
    }
    
    // Show customers
    if (input.includes('customers') || input.includes('customer list')) {
      if (customers.length === 0) {
        return 'No customers found in the system.';
      }
      return `👥 Customer Summary:\n• Total Customers: ${customers.length}\n• Recent customers:\n${customers.slice(-3).map(c => 
        `• ${c.name} (${c.email})`
      ).join('\n')}`;
    }
    
    // Show suppliers
    if (input.includes('suppliers') || input.includes('supplier list')) {
      if (suppliers.length === 0) {
        return 'No suppliers found in the system.';
      }
      return `🏪 Supplier Summary:\n• Total Suppliers: ${suppliers.length}\n• Active suppliers:\n${suppliers.slice(-3).map(s => 
        `• ${s.name} (${s.contact_email})`
      ).join('\n')}`;
    }
    
    // Search for specific product
    if (input.includes('find') || input.includes('search')) {
      const searchTerm = input.replace(/find|search|product|item/g, '').trim();
      if (searchTerm) {
        const foundProducts = products.filter(p => 
          p.name.toLowerCase().includes(searchTerm)
        );
        if (foundProducts.length === 0) {
          return `No products found matching "${searchTerm}".`;
        }
        return `🔍 Found ${foundProducts.length} product(s) matching "${searchTerm}":\n${foundProducts.map(p => 
          `• ${p.name}: ${p.quantity} units in stock`
        ).join('\n')}`;
      }
    }
    
    // Analytics and insights
    if (input.includes('analytics') || input.includes('insights') || input.includes('stats')) {
      const totalOrders = orders.length;
      const totalCustomers = customers.length;
      const totalSuppliers = suppliers.length;
      const avgOrderQty = orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.quantity, 0) / orders.length) : 0;
      
      return `📊 Analytics Dashboard:\n• Total Orders: ${totalOrders}\n• Total Customers: ${totalCustomers}\n• Total Suppliers: ${totalSuppliers}\n• Average Order Quantity: ${avgOrderQty} units\n• Products in Stock: ${products.length}`;
    }
    
    // Help command
    if (input.includes('help') || input.includes('commands')) {
      return `🤖 Available Commands:\n• "Show low stock items" - View items needing restock\n• "Inventory summary" - Get stock overview\n• "Recent orders" - View latest orders\n• "Show customers" - List customer information\n• "Show suppliers" - List supplier information\n• "Find [product name]" - Search for specific products\n• "Analytics" - View business insights\n• "Help" - Show this command list`;
    }
    
    // Default response for unrecognized commands
    return `I understand you said: "${userInput}"\n\nI can help you with:\n• Inventory management\n• Order tracking\n• Customer/supplier information\n• Stock analytics\n\nTry asking: "Show low stock items" or "Recent orders" or type "help" for more commands.`;
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = await processAICommand(chatInput);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: aiResponse
      };
      
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
    
    setChatLoading(false);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Add token to fetch requests
  const fetchWithAuth = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  };

  // Filtered products and orders
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrders = orders.filter(o =>
    (productMap[o.product_id] || '').toLowerCase().includes(orderSearch.toLowerCase())
  );

  // Paginated data
  const paginatedProducts = filteredProducts.slice((productPage - 1) * pageSize, productPage * pageSize);
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * pageSize, orderPage * pageSize);

  // Utility: Convert array to CSV
  function arrayToCSV(data, columns) {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','));
    return [header, ...rows].join('\n');
  }

  // Utility: Download CSV
  function downloadCSV(data, columns, filename) {
    const csv = arrayToCSV(data, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Utility: Export table to PDF
  function exportPDF(data, columns, title, filename) {
    const doc = new jsPDF();
    doc.text(title, 14, 16);
    doc.autoTable({
      head: [columns],
      body: data.map(row => columns.map(col => row[col] ?? '')),
      startY: 22,
    });
    doc.save(filename);
  }

  // Dashboard analytics section
  function DashboardAnalytics({ products, orders, productMap }) {
    // Stock by product
    const stockData = {
      labels: products.map(p => p.name),
      datasets: [{
        label: 'Stock',
        data: products.map(p => p.quantity),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }],
    };
    // Orders by product
    const orderCounts = {};
    orders.forEach(o => {
      const name = productMap[o.product_id] || o.product_id;
      orderCounts[name] = (orderCounts[name] || 0) + o.quantity;
    });
    const orderData = {
      labels: Object.keys(orderCounts),
      datasets: [{
        label: 'Orders',
        data: Object.values(orderCounts),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
      }],
    };
    return (
      <section>
        <h2>Dashboard Analytics</h2>
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ width: 400 }}>
            <h4>Stock by Product</h4>
            <Bar data={stockData} />
          </div>
          <div style={{ width: 400 }}>
            <h4>Orders by Product</h4>
            <Pie data={orderData} />
          </div>
        </div>
      </section>
    );
  }

  // Suppliers Tab Component
  function SuppliersTab() {
    return (
      <section>
        <h2>Suppliers</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.contact_email}</td>
                <td>{s.contact_phone}</td>
                <td>{s.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={handleAddSupplier} className="add-form">
          <input
            placeholder="Supplier Name"
            value={newSupplier.name}
            onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={newSupplier.contact_email}
            onChange={e => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={newSupplier.contact_phone}
            onChange={e => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
          />
          <input
            placeholder="Address"
            value={newSupplier.address}
            onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
          />
          <button type="submit" disabled={loading}>Add Supplier</button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>
    );
  }

  // Alerts Tab Component
  function AlertsTab() {
    return (
      <section>
        <h2>Low Stock Alerts</h2>
        {lowStockAlerts.length === 0 ? (
          <p>No low stock alerts</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Supplier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lowStockAlerts.map(alert => (
                <tr key={alert.id} style={{ backgroundColor: '#ffebee' }}>
                  <td>{alert.name}</td>
                  <td>{alert.quantity}</td>
                  <td>{alert.reorder_point || 10}</td>
                  <td>{alert.supplier_name || 'N/A'}</td>
                  <td>
                    <button onClick={() => alert.supplier_name && alert('Create Purchase Order')}>
                      Reorder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  }

  // Purchase Orders Tab Component
  function PurchaseOrdersTab() {
    return (
      <section>
        <h2>Purchase Orders</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Total Amount</th>
              <th>Order Date</th>
              <th>Expected Delivery</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map(po => (
              <tr key={po.id}>
                <td>{po.id}</td>
                <td>{po.supplier_name}</td>
                <td>{po.status}</td>
                <td>${po.total_amount}</td>
                <td>{po.order_date}</td>
                <td>{po.expected_delivery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  // History tab component
  function HistoryTab() {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
      fetch('${API_URL}/api/audit-logs')
        .then(res => res.json())
        .then(setLogs);
    }, []);
    return (
      <section>
        <h2>Audit Log</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.created_at}</td>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>{log.entity_id}</td>
                <td><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.details}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  // Bulk import handler
  function handleImport(endpoint, fetchData) {
    return async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      await fetch(`${API_URL}/api/${endpoint}/import`, {
        method: 'POST',
        body: formData,
      });
      fetchData();
    };
  }

  // Barcode Scanner Component
  function BarcodeScanner({ onDetected, onClose }) {
    const scannerRef = useRef(null);

    useEffect(() => {
      if (scannerRef.current) {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 480,
              height: 320,
              facingMode: "environment"
            }
          },
          decoder: {
            readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"]
          }
        }, (err) => {
          if (err) {
            console.log(err);
            return;
          }
          Quagga.start();
        });

        Quagga.onDetected((data) => {
          onDetected(data.codeResult.code);
          Quagga.stop();
          onClose();
        });
      }

      return () => {
        Quagga.stop();
      };
    }, [onDetected, onClose]);

    return (
      <div className="barcode-scanner">
        <div ref={scannerRef}></div>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  }

  // Enhanced Product Form with barcode scanning
  function EnhancedProductForm() {
    const [showScanner, setShowScanner] = useState(false);
    const [productForm, setProductForm] = useState({
      name: '',
      quantity: '',
      sku: '',
      category: '',
      cost_price: '',
      selling_price: '',
      reorder_point: '',
      max_stock: '',
      barcode: ''
    });

    const handleBarcodeDetected = (code) => {
      setProductForm({ ...productForm, barcode: code });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Add product with enhanced details
      await fetch('${API_URL}/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      fetchProducts();
      setProductForm({
        name: '', quantity: '', sku: '', category: '', cost_price: '',
        selling_price: '', reorder_point: '', max_stock: '', barcode: ''
      });
    };

    return (
      <div>
        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
        <form onSubmit={handleSubmit} className="enhanced-product-form">
          <input
            placeholder="Product Name"
            value={productForm.name}
            onChange={e => setProductForm({ ...productForm, name: e.target.value })}
          />
          <input
            placeholder="SKU"
            value={productForm.sku}
            onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
          />
          <input
            placeholder="Category"
            value={productForm.category}
            onChange={e => setProductForm({ ...productForm, category: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={productForm.quantity}
            onChange={e => setProductForm({ ...productForm, quantity: e.target.value })}
          />
          <input
            type="number"
            placeholder="Cost Price"
            value={productForm.cost_price}
            onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Selling Price"
            value={productForm.selling_price}
            onChange={e => setProductForm({ ...productForm, selling_price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Reorder Point"
            value={productForm.reorder_point}
            onChange={e => setProductForm({ ...productForm, reorder_point: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              placeholder="Barcode"
              value={productForm.barcode}
              onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
            />
            <button type="button" onClick={() => setShowScanner(true)}>Scan Barcode</button>
          </div>
          <button type="submit">Add Product</button>
        </form>
      </div>
    );
  }

  // Sales Order Form Component
  function SalesOrderForm() {
    const [formData, setFormData] = useState({
      customer_id: '',
      expected_delivery: '',
      notes: '',
      items: []
    });
    const [newItem, setNewItem] = useState({
      product_id: '',
      quantity: '',
      unit_price: ''
    });

    const addItem = () => {
      if (!newItem.product_id || !newItem.quantity || !newItem.unit_price) {
        setError('Please fill all item fields');
        return;
      }
      const product = products.find(p => p.id === parseInt(newItem.product_id));
      if (!product) {
        setError('Product not found');
        return;
      }
      if (parseInt(newItem.quantity) > product.quantity) {
        setError('Insufficient stock available');
        return;
      }
      
      const item = {
        product_id: parseInt(newItem.product_id),
        product_name: product.name,
        quantity: parseInt(newItem.quantity),
        unit_price: parseFloat(newItem.unit_price),
        total: parseInt(newItem.quantity) * parseFloat(newItem.unit_price)
      };
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, item]
      }));
      setNewItem({ product_id: '', quantity: '', unit_price: '' });
    };

    const removeItem = (index) => {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      if (!formData.customer_id || formData.items.length === 0) {
        setError('Please select a customer and add at least one item');
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch('${API_URL}/api/sales-orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Failed to create sales order');
        await fetchSalesOrders();
        await fetchProducts(); // Refresh products to show updated quantities
        setFormData({ customer_id: '', expected_delivery: '', notes: '', items: [] });
        setShowOrderForm(false);
      } catch (err) {
        setError('Failed to create sales order: ' + err.message);
      }
      setLoading(false);
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

    return (
      <div className="modal-overlay" onClick={() => setShowOrderForm(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Sales Order</h2>
            <button className="close-btn" onClick={() => setShowOrderForm(false)}>×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Customer *</label>
              <select
                value={formData.customer_id}
                onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                required
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Expected Delivery Date</label>
              <input
                type="date"
                value={formData.expected_delivery}
                onChange={e => setFormData({ ...formData, expected_delivery: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="items-section">
              <h3>Order Items</h3>
              
              <div className="add-item-form">
                <select
                  value={newItem.product_id}
                  onChange={e => setNewItem({ ...newItem, product_id: e.target.value })}
                >
                  <option value="">Select product</option>
                  {products.filter(p => p.quantity > 0).map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.quantity})
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  placeholder="Quantity"
                  value={newItem.quantity}
                  onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                  min="1"
                />
                
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={newItem.unit_price}
                  onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                  step="0.01"
                  min="0.01"
                />
                
                <button type="button" onClick={addItem}>Add Item</button>
              </div>

              {formData.items.length > 0 && (
                <div className="items-list">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>${item.unit_price.toFixed(2)}</td>
                          <td>${item.total.toFixed(2)}</td>
                          <td>
                            <button type="button" onClick={() => removeItem(index)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="order-total">
                    <strong>Total Amount: ${totalAmount.toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading || formData.items.length === 0}>
                Create Sales Order
              </button>
              <button type="button" onClick={() => setShowOrderForm(false)}>Cancel</button>
            </div>
          </form>
          
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  // AI Chat Assistant Component
  function ChatAssistant() {
    const [messages, setMessages] = useState([
      { id: 1, type: 'bot', content: 'Hello! I\'m your AI Warehouse Assistant. I can help you with inventory management, orders, analytics, and more. Try asking me: "Show low stock items" or "Create order for customer ABC"' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    const handleSend = async () => {
      if (!input.trim()) return;
      const userMessage = { id: Date.now(), type: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      // Simulate AI response
      setTimeout(() => {
        const botMessage = { id: Date.now() + 1, type: 'bot', content: 'This is a simulated response. Implement AI logic here.' };
        setMessages(prev => [...prev, botMessage]);
        setLoading(false);
      }, 1000);
    };

    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [messages]);

    return (
      <div className="chat-assistant">
        <div className="chat-header">AI Warehouse Assistant</div>
        <div className="chat-messages" ref={containerRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              {msg.content}
            </div>
          ))}
          {loading && <div className="chat-message bot">Typing...</div>}
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything..."
          />
          <button onClick={handleSend} disabled={loading}>Send</button>
        </div>
      </div>
    );
  }

  // UI rendering
  if (!token) {
    return (
      <div className="auth-container">
        <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        {DEMO_MODE && (
          <div style={{ 
            background: 'rgba(255,255,255,0.9)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            color: '#0047AB',
            textAlign: 'center'
          }}>
            <strong>🎬 Demo Mode</strong><br/>
            Use: <strong>admin</strong> / <strong>admin</strong><br/>
            Or: <strong>demo</strong> / <strong>demo</strong>
          </div>
        )}
        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={authForm.username}
            onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={authForm.password}
            onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
          />
          {authMode === 'register' && (
            <select value={authForm.role} onChange={e => setAuthForm({ ...authForm, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button type="submit" disabled={loading}>{authMode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>Warehouse Management Dashboard</h1>
        <button onClick={handleLogout} style={{ float: 'right' }}>Logout</button>
        <div style={{ float: 'right', marginRight: 10 }}>Role: {role}</div>
        <nav>
          <button onClick={() => setTab('dashboard')} className={tab === 'dashboard' ? 'active' : ''}>Dashboard</button>
          <button onClick={() => setTab('inventory')} className={tab === 'inventory' ? 'active' : ''}>Inventory</button>
          <button onClick={() => setTab('orders')} className={tab === 'orders' ? 'active' : ''}>Orders</button>
          <button onClick={() => setTab('suppliers')} className={tab === 'suppliers' ? 'active' : ''}>Suppliers</button>
          <button onClick={() => setTab('purchase-orders')} className={tab === 'purchase-orders' ? 'active' : ''}>Purchase Orders</button>
          <button onClick={() => setTab('alerts')} className={tab === 'alerts' ? 'active' : ''}>Alerts</button>
          <button onClick={() => setTab('history')} className={tab === 'history' ? 'active' : ''}>History</button>
          <button onClick={() => setTab('customers')} className={tab === 'customers' ? 'active' : ''}>Customers</button>
          <button onClick={() => setTab('sales-orders')} className={tab === 'sales-orders' ? 'active' : ''}>Sales Orders</button>
          <button onClick={() => setTab('chat')} className={tab === 'chat' ? 'active' : ''}>🤖 AI Assistant</button>
        </nav>
      </header>
      <main>
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {tab === 'dashboard' && (
          <DashboardAnalytics products={products} orders={orders} productMap={productMap} />
        )}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'purchase-orders' && <PurchaseOrdersTab />}
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'inventory' && (
          <section>
            <h2>Inventory</h2>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => downloadCSV(products, ['id', 'name', 'quantity'], 'inventory.csv')}>Export CSV</button>
              <button onClick={() => exportPDF(products, ['id', 'name', 'quantity'], 'Inventory', 'inventory.pdf')} style={{ marginLeft: 10 }}>Export PDF</button>
              <a href="${API_URL}/api/products/export" download style={{ marginLeft: 10 }}>Download CSV (Server)</a>
              <input type="file" accept=".csv" onChange={handleImport('products', fetchProducts)} style={{ marginLeft: 10 }} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className={p.quantity < 10 ? 'low-stock' : ''}>
                    <td>{p.id}</td>
                    <td>{editProduct && editProduct.id === p.id ? (
                      <input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
                    ) : p.name}</td>
                    <td>{editProduct && editProduct.id === p.id ? (
                      <input type="number" value={editProduct.quantity} onChange={e => setEditProduct({ ...editProduct, quantity: e.target.value })} />
                    ) : p.quantity}</td>
                    <td>
                      {editProduct && editProduct.id === p.id ? (
                        <>
                          <button onClick={handleEditProduct}>Save</button>
                          <button onClick={() => setEditProduct(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditProduct(p)}>Edit</button>
                          <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button onClick={() => setProductPage(productPage - 1)} disabled={productPage === 1}>Prev</button>
              <span>Page {productPage} of {Math.ceil(filteredProducts.length / pageSize)}</span>
              <button onClick={() => setProductPage(productPage + 1)} disabled={productPage * pageSize >= filteredProducts.length}>Next</button>
            </div>
            <form onSubmit={handleAddProduct} className="add-form">
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newProduct.quantity}
                onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })}
              />
              <button type="submit">Add Product</button>
            </form>
            <div style={{ marginTop: 10 }}>
              <span className="low-stock">* Low stock warning: less than 10 units</span>
            </div>
          </section>
        )}
        {tab === 'orders' && (
          <section>
            <h2>Orders</h2>
            <input
              type="text"
              placeholder="Search orders by product..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => downloadCSV(orders, ['id', 'product_id', 'quantity', 'created_at'], 'orders.csv')}>Export CSV</button>
              <button onClick={() => exportPDF(orders, ['id', 'product_id', 'quantity', 'created_at'], 'Orders', 'orders.pdf')} style={{ marginLeft: 10 }}>Export PDF</button>
              <a href="${API_URL}/api/orders/export" download style={{ marginLeft: 10 }}>Download CSV (Server)</a>
              <input type="file" accept=".csv" onChange={handleImport('orders', fetchOrders)} style={{ marginLeft: 10 }} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{editOrder && editOrder.id === o.id ? (
                      <select value={editOrder.product_id} onChange={e => setEditOrder({ ...editOrder, product_id: e.target.value })}>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (productMap[o.product_id] || o.product)}</td>
                    <td>{editOrder && editOrder.id === o.id ? (
                      <input type="number" value={editOrder.quantity} onChange={e => setEditOrder({ ...editOrder, quantity: e.target.value })} />
                    ) : o.quantity}</td>
                    <td>{o.created_at || o.date}</td>
                    <td>
                      {editOrder && editOrder.id === o.id ? (
                        <>
                          <button onClick={handleEditOrder}>Save</button>
                          <button onClick={() => setEditOrder(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditOrder(o)}>Edit</button>
                          <button onClick={() => handleDeleteOrder(o.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button onClick={() => setOrderPage(orderPage - 1)} disabled={orderPage === 1}>Prev</button>
              <span>Page {orderPage} of {Math.ceil(filteredOrders.length / pageSize)}</span>
              <button onClick={() => setOrderPage(orderPage + 1)} disabled={orderPage * pageSize >= filteredOrders.length}>Next</button>
            </div>
            <form onSubmit={handleAddOrder} className="add-form">
              <select
                value={newOrder.product_id}
                onChange={e => setNewOrder({ ...newOrder, product_id: e.target.value })}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={newOrder.quantity}
                onChange={e => setNewOrder({ ...newOrder, quantity: e.target.value })}
              />
              <button type="submit">Add Order</button>
            </form>
          </section>
        )}
        {tab === 'history' && <HistoryTab />}
        {tab === 'suppliers' && (
          <section>
            <h2>Suppliers</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.contact_email}</td>
                    <td>{s.contact_phone}</td>
                    <td>{s.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form onSubmit={handleAddSupplier} className="add-form">
              <input
                placeholder="Supplier Name"
                value={newSupplier.name}
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
              <input
                placeholder="Email"
                value={newSupplier.contact_email}
                onChange={e => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
              />
              <input
                placeholder="Phone"
                value={newSupplier.contact_phone}
                onChange={e => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
              />
              <input
                placeholder="Address"
                value={newSupplier.address}
                onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
              <button type="submit">Add Supplier</button>
            </form>
          </section>
        )}
        {tab === 'alerts' && (
          <section>
            <h2>Low Stock Alerts</h2>
            {lowStockAlerts.length === 0 ? (
              <p>No low stock alerts</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Reorder Point</th>
                    <th>Supplier</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockAlerts.map(alert => (
                    <tr key={alert.id} style={{ backgroundColor: '#ffebee' }}>
                      <td>{alert.name}</td>
                      <td>{alert.quantity}</td>
                      <td>{alert.reorder_point || 10}</td>
                      <td>{alert.supplier_name || 'N/A'}</td>
                      <td>
                        <button onClick={() => alert.supplier_name && alert('Create Purchase Order')}>
                          Reorder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
        {tab === 'purchase-orders' && (
          <section>
            <h2>Purchase Orders</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id}>
                    <td>{po.id}</td>
                    <td>{po.supplier_name}</td>
                    <td>{po.status}</td>
                    <td>${po.total_amount}</td>
                    <td>{po.order_date}</td>
                    <td>{po.expected_delivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {tab === 'customers' && (
          <section>
            <h2>Customers</h2>
            <div style={{ marginBottom: '2rem' }}>
              <button onClick={() => setShowOrderForm(true)} style={{ marginRight: '1rem' }}>
                Create Sales Order
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Credit Limit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>{customer.id}</td>
                    <td>{editCustomer && editCustomer.id === customer.id ? (
                      <input value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} />
                    ) : customer.name}</td>
                    <td>{editCustomer && editCustomer.id === customer.id ? (
                      <input value={editCustomer.email} onChange={e => setEditCustomer({ ...editCustomer, email: e.target.value })} />
                    ) : customer.email}</td>
                    <td>{editCustomer && editCustomer.id === customer.id ? (
                      <input value={editCustomer.phone} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} />
                    ) : customer.phone}</td>
                    <td>{editCustomer && editCustomer.id === customer.id ? (
                      <input value={editCustomer.city} onChange={e => setEditCustomer({ ...editCustomer, city: e.target.value })} />
                    ) : customer.city}</td>
                    <td>{customer.customer_type}</td>
                    <td>${customer.credit_limit}</td>
                    <td>
                      {editCustomer && editCustomer.id === customer.id ? (
                        <>
                          <button onClick={handleEditCustomer}>Save</button>
                          <button onClick={() => setEditCustomer(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditCustomer(customer)}>Edit</button>
                          <button onClick={() => handleDeleteCustomer(customer.id)}>Delete</button>
                          <button onClick={() => setSelectedCustomer(customer)}>View Orders</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <form onSubmit={handleAddCustomer} className="add-form">
              <input
                placeholder="Customer Name *"
                value={newCustomer.name}
                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                required
              />
              <input
                placeholder="Email"
                type="email"
                value={newCustomer.email}
                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
              <input
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
              <input
                placeholder="Address"
                value={newCustomer.address}
                onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
              <input
                placeholder="City"
                value={newCustomer.city}
                onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })}
              />
              <input
                placeholder="State"
                value={newCustomer.state}
                onChange={e => setNewCustomer({ ...newCustomer, state: e.target.value })}
              />
              <input
                placeholder="ZIP Code"
                value={newCustomer.zip_code}
                onChange={e => setNewCustomer({ ...newCustomer, zip_code: e.target.value })}
              />
              <select
                value={newCustomer.customer_type}
                onChange={e => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
              >
                <option value="regular">Regular</option>
                <option value="wholesale">Wholesale</option>
                <option value="vip">VIP</option>
              </select>
              <input
                placeholder="Credit Limit"
                type="number"
                value={newCustomer.credit_limit}
                onChange={e => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
              />
              <button type="submit" disabled={loading}>Add Customer</button>
            </form>
            {error && <div className="error">{error}</div>}
          </section>
        )}
        {tab === 'sales-orders' && (
          <section>
            <h2>Sales Orders</h2>
            <div style={{ marginBottom: '2rem' }}>
              <button onClick={() => setShowOrderForm(true)}>Create New Sales Order</button>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Expected Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.status}</td>
                    <td>{new Date(order.order_date).toLocaleDateString()}</td>
                    <td>${order.total_amount}</td>
                    <td>{order.expected_delivery}</td>
                    <td>
                      <button>View Details</button>
                      <button>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {tab === 'chat' && (
          <section>
            <h2>🤖 AI Warehouse Assistant</h2>
            <div className="chat-interface">
              <div className="chat-messages" ref={chatContainerRef}>
                {chatMessages.map(message => (
                  <div key={message.id} className={`chat-message ${message.type}`}>
                    <div className="message-content">
                      {message.type === 'bot' && <span className="bot-icon">🤖</span>}
                      <div className="message-text">
                        {message.content.split('\n').map((line, index) => (
                          <div key={index}>{line}</div>
                        ))}
                      </div>
                      {message.type === 'user' && <span className="user-icon">👤</span>}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message bot">
                    <div className="message-content">
                      <span className="bot-icon">🤖</span>
                      <div className="message-text typing">AI is thinking...</div>
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleChatSubmit} className="chat-input-form">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me about inventory, orders, analytics, or type 'help'..."
                  className="chat-input"
                  disabled={chatLoading}
                />
                <button type="submit" disabled={chatLoading || !chatInput.trim()}>
                  Send
                </button>
              </form>
              
              <div className="chat-suggestions">
                <p><strong>Try these commands:</strong></p>
                <div className="suggestion-buttons">
                  <button type="button" onClick={() => setChatInput('Show low stock items')}>
                    Low Stock Items
                  </button>
                  <button type="button" onClick={() => setChatInput('Inventory summary')}>
                    Inventory Summary
                  </button>
                  <button type="button" onClick={() => setChatInput('Recent orders')}>
                    Recent Orders
                  </button>
                  <button type="button" onClick={() => setChatInput('Analytics')}>
                    Analytics
                  </button>
                  <button type="button" onClick={() => setChatInput('Help')}>
                    Help
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {showOrderForm && <SalesOrderForm />}
      </main>
    </div>
  );
}

export default App;
