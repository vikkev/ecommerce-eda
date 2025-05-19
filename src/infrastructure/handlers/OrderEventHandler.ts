import { logger } from '../../config/rabbitmq';
import { EcommerceEvent } from '../../domain/events/Events';
import { OrderService } from '../../application/services/OrderService';
import { MessageHandler } from '../messaging/subscriber/MessageSubscriber';

export class OrderEventHandler implements MessageHandler {
  private orderService: OrderService;

  constructor(orderService: OrderService) {
    this.orderService = orderService;
  }

  async handleMessage(event: EcommerceEvent): Promise<void> {
    logger.info(`Handling event: ${event.eventType}`, { eventId: event.eventId });

    try {
      switch (event.eventType) {
        case 'OrderCreated':
          await this.handleOrderCreated(event);
          break;
        case 'OrderStatusChanged':
          await this.handleOrderStatusChanged(event);
          break;
        case 'OrderPaymentProcessed':
          await this.handleOrderPaymentProcessed(event);
          break;
        default:
          logger.warn(`Unknown event type: ${(event as EcommerceEvent).eventType}`, { eventId: (event as EcommerceEvent).eventId });
          // Aqui poderíamos lançar um erro para forçar a mensagem para a DLQ
          // throw new Error(`Unknown event type: ${event.eventType}`);
      }
    } catch (error) {
      logger.error(`Error handling event: ${event.eventType}`, {
        eventId: event.eventId,
        error: error
      });
      throw error; // Re-throw para que o subscriber possa tratar e enviar para a DLQ se necessário
    }
  }

  private async handleOrderCreated(event: EcommerceEvent): Promise<void> {
    if (event.eventType !== 'OrderCreated') return;
    
    try {
      const orderData = event.payload.order;
      
      // Simular uma chamada de API externa para criar o pedido
      const result = await this.orderService.createOrder(orderData);
      
      logger.info(`Order created successfully: ${orderData.id}`);
    } catch (error) {
      logger.error(`Failed to create order from event`, { error });
      throw error;
    }
  }

  private async handleOrderStatusChanged(event: EcommerceEvent): Promise<void> {
    if (event.eventType !== 'OrderStatusChanged') return;
    
    try {
      const { orderId, newStatus } = event.payload;
      
      // Atualizar o status do pedido
      await this.orderService.updateOrderStatus(orderId, newStatus);
      
      logger.info(`Order status updated: ${orderId} -> ${newStatus}`);
    } catch (error) {
      logger.error(`Failed to update order status from event`, { error });
      throw error;
    }
  }

  private async handleOrderPaymentProcessed(event: EcommerceEvent): Promise<void> {
    if (event.eventType !== 'OrderPaymentProcessed') return;
    
    try {
      const { orderId, status, paymentId } = event.payload;
      
      // Processar o pagamento
      if (status === 'success') {
        await this.orderService.confirmOrderPayment(orderId, paymentId);
        logger.info(`Payment confirmed for order: ${orderId}`);
      } else {
        await this.orderService.failOrderPayment(orderId, paymentId);
        logger.info(`Payment failed for order: ${orderId}`);
      }
    } catch (error) {
      logger.error(`Failed to process payment from event`, { error });
      throw error;
    }
  }
}