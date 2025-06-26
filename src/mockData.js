// Mock API data for demo deployment
export const mockData = {
  products: [
    { id: 1, name: 'Laptop Computer', quantity: 25, price: 999.99, category: 'Electronics' },
    { id: 2, name: 'Office Chair', quantity: 8, category: 'Furniture' },
    { id: 3, name: 'Wireless Mouse', quantity: 45, category: 'Electronics' },
    { id: 4, name: 'Desk Lamp', quantity: 12, category: 'Furniture' },
    { id: 5, name: 'USB Cable', quantity: 5, category: 'Electronics' }, // Low stock
  ],
  orders: [
    { id: 1, product_id: 1, quantity: 2, created_at: '2025-06-26T10:00:00Z' },
    { id: 2, product_id: 3, quantity: 10, created_at: '2025-06-26T09:30:00Z' },
    { id: 3, product_id: 2, quantity: 1, created_at: '2025-06-25T14:20:00Z' },
  ],
  customers: [
    { id: 1, name: 'Acme Corp', email: 'contact@acme.com', phone: '555-0123' },
    { id: 2, name: 'Tech Solutions Inc', email: 'info@techsol.com', phone: '555-0456' },
    { id: 3, name: 'Global Enterprises', email: 'sales@global.com', phone: '555-0789' },
  ],
  suppliers: [
    { id: 1, name: 'Electronics Wholesale', contact_email: 'orders@ewholesale.com', contact_phone: '555-1111' },
    { id: 2, name: 'Office Furniture Co', contact_email: 'sales@furniture.com', contact_phone: '555-2222' },
  ],
  salesOrders: [
    { id: 1, customer_name: 'Acme Corp', status: 'completed', order_date: '2025-06-25', total_amount: 1999.98, expected_delivery: '2025-06-28' },
    { id: 2, customer_name: 'Tech Solutions Inc', status: 'pending', order_date: '2025-06-26', total_amount: 399.99, expected_delivery: '2025-06-30' },
  ]
};

// Mock API functions
export const mockAPI = {
  async get(endpoint) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    if (endpoint.includes('/products')) return mockData.products;
    if (endpoint.includes('/orders')) return mockData.orders;
    if (endpoint.includes('/customers')) return mockData.customers;
    if (endpoint.includes('/suppliers')) return mockData.suppliers;
    if (endpoint.includes('/sales-orders')) return mockData.salesOrders;
    
    return [];
  },
  
  async post(endpoint, data) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, id: Date.now() };
  },
  
  async put(endpoint, data) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
  
  async delete(endpoint) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
};
