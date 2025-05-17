import { Order, OrderStatus } from '../../domain/entities/Order';
import { logger } from '../../config/rabbitmq.ts';

// Interface simulada para repositório de pedidos
interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  update(order: Order): Promise<Order>;
}

// Simulação de um repositório em memória
class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async update(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }
}

// Simulação de serviço de API externa
interface ExternalApiService {
  sendOrderToExternalApi(order: Order): Promise<{ success: boolean, data?: any, error?: string }>;
}

// Implementação simulada de chamada à API externa
class MockExternalApiService implements ExternalApiService {
  async sendOrderToExternalApi(order: Order): Promise<{ success: boolean, data?: any, error?: string }> {
    // Simular um tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Ocasionalmente simular falhas para testar o DLQ
    const shouldFail = Math.random() < 0.2; // 20% de chance de falha
    
    if (shouldFail) {
      logger.warn(`External API call failed for order: ${order.id}`);
      return { 
        success: false, 
        error: 'External API service unavailable' 
      };
    }
    
    logger.info(`External API call successful for order: ${order.id}`);
    return { 
      success: true, 
      data: { 
        externalOrderId: `ext-${order.id}`, 
        status: 'received' 
      } 
    };
  }
}

export class OrderService {
  private repository: OrderRepository;
  private apiService: ExternalApiService;

  constructor() {
    // Em uma aplicação real, estes seriam injetados
    this.repository = new InMemoryOrderRepository();
    this.apiService = new MockExternalApiService();
  }

  async createOrder(orderData: any): Promise<Order> {
    try {
      // Criar instância da entidade Order
      const order = new Order(
        orderData.id,
        orderData.customerId,
        orderData.items,
        orderData.totalAmount,
        orderData.status || 'pending'
      );
      
      // Salvar no repositório
      await this.repository.save(order);
      
      // Enviar para a API externa
      const apiResult = await this.apiService.sendOrderToExternalApi(order);
      
      if (!apiResult.success) {
        throw new Error(`Failed to send order to external API: ${apiResult.error}`);
      }
      
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, newStatus: string): Promise<Order> {
    try {
      const order = await this.repository.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Atualizar status
      order.updateStatus(newStatus as OrderStatus);
      
      // Salvar no repositório
      await this.repository.update(order);
      
      return order;
    } catch (error) {
      logger.error(`Error updating order status:`, { orderId, error });
      throw error;
    }
  }

  async confirmOrderPayment(orderId: string, paymentId: string): Promise<Order> {
    try {
      const order = await this.repository.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Atualizar status
      order.updateStatus('completed');
      
      // Salvar no repositório
      await this.repository.update(order);
      
      return order;
    } catch (error) {
      logger.error(`Error confirming order payment:`, { orderId, paymentId, error });
      throw error;
    }
  }

  async failOrderPayment(orderId: string, paymentId: string): Promise<Order> {
    try {
      const order = await this.repository.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Atualizar status
      order.updateStatus('failed');
      
      // Salvar no repositório
      await this.repository.update(order);
      
      return order;
    } catch (error) {
      logger.error(`Error failing order payment:`, { orderId, paymentId, error });
      throw error;
    }
  }
}