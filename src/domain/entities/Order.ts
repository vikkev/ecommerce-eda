export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';

export class Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(id: string, customerId: string, items: OrderItem[], totalAmount: number, status: OrderStatus = 'pending') {
    this.id = id;
    this.customerId = customerId;
    this.items = items;
    this.totalAmount = totalAmount;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: OrderStatus): Order {
    this.status = newStatus;
    this.updatedAt = new Date();
    return this;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      customerId: this.customerId,
      items: this.items,
      totalAmount: this.totalAmount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}