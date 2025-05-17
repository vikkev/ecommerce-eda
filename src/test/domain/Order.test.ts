import { Order, OrderItem } from '../../domain/entities/Order';

describe('Order Entity', () => {
  const mockItems: OrderItem[] = [
    {
      productId: 'prod1',
      name: 'Item 1',
      price: 100,
      quantity: 2
    }
  ];

  it('should create an order with correct properties', () => {
    const order = new Order('order123', 'customer123', mockItems, 200);
    
    expect(order.id).toBe('order123');
    expect(order.customerId).toBe('customer123');
    expect(order.items).toBe(mockItems);
    expect(order.totalAmount).toBe(200);
    expect(order.status).toBe('pending');
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
  });

  it('should update the order status', () => {
    const order = new Order('order123', 'customer123', mockItems, 200);
    const initialDate = order.updatedAt;
    
    // Aguardar para que a data de atualização seja diferente
    setTimeout(() => {
      order.updateStatus('processing');
      
      expect(order.status).toBe('processing');
      expect(order.updatedAt.getTime()).toBeGreaterThan(initialDate.getTime());
    }, 10);
  });

  it('should convert to JSON correctly', () => {
    const order = new Order('order123', 'customer123', mockItems, 200);
    const json = order.toJSON();
    
    expect(json).toEqual({
      id: 'order123',
      customerId: 'customer123',
      items: mockItems,
      totalAmount: 200,
      status: 'pending',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    });
  });
});