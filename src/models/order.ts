export interface Order {
    id: number;
    customer_id: number;  // FK — this is the "connection" to customers
    product: string;
    amount: number;
    status: 'pending' | 'paid' | 'cancelled';
    created_at: string;
}

export interface CreateOrderDto {
    customer_id: number;
    product: string;
    amount: number;
}

// Order joined with the customer name — useful for API responses
export interface OrderWithCustomer extends Order {
    customer_name: string;
    customer_email: string;
}