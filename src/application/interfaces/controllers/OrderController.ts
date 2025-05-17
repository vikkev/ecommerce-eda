import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MessagePublisher } from '../../../infrastructure/messaging/publisher/MessagePublisher';
import { OrderService } from '../../services/OrderService';
import { logger } from '../../config/rabbitmq';

export class OrderController {
  private publisher: MessagePublisher;
  private orderService: OrderService;

  constructor(publisher: MessagePublisher, orderService: OrderService) {
    this.publisher = publisher;
    this.orderService = orderService;
  }

  setupRoutes(router: express.Router): void {
    router.post('/orders', this.createOrder.bind(this));
    router.put('/orders/:id/status', this.updateOrderStatus.bind(this));
    router.post('/orders/:id/payment', this.processPayment.bind(this));
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      
      // Validar os dados do pedido
      if (!orderData.customerId || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        res.status(400).json({ error: 'Invalid order data' });
        return;
      }
      
      // Calcular o valor total (em uma aplicação real, isso seria mais complexo)
      const totalAmount = orderData.items.reduce(
        (total: number, item: any) => total + (item.price * item.quantity), 
        0
      );
      
      // Criar o objeto de pedido
      const order = {
        id: orderData.id || uuidv4(),
        customerId: orderData.customerId,
        items: orderData.items,
        totalAmount,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Publicar evento OrderCreated
      const published = await this.publisher.createOrderCreatedEvent(order);
      
      if (!published) {
        throw new Error('Failed to publish order created event');
      }
      
      res.status(201).json({
        message: 'Order created successfully',
        orderId: order.id,
        status: 'processing'
      });
    } catch (error) {
      logger.error('Error creating order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        res.status(400).json({ error: 'Order ID and status are required' });
        return;
      }
      
      // Publicar evento OrderStatusChanged
      const published = await this.publisher.createOrderStatusChangedEvent(id, 'unknown', status);
      
      if (!published) {
        throw new Error('Failed to publish order status changed event');
      }
      
      res.status(200).json({
        message: `Order status update initiated`,
        orderId: id,
        status: 'processing'
      });
    } catch (error) {
      logger.error('Error updating order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentDetails } = req.body;
      
      if (!id || !paymentDetails) {
        res.status(400).json({ error: 'Order ID and payment details are required' });
        return;
      }
      
      // Em uma aplicação real, aqui processaríamos o pagamento com um gateway
      // e então publicaríamos o evento com o resultado
      
      // Simular processamento de pagamento
      const paymentId = uuidv4();
      const paymentSuccessful = Math.random() > 0.3; // 70% de chance de sucesso
      
      // Publicar evento OrderPaymentProcessed
      const event = {
        eventId: uuidv4(),
        eventType: 'OrderPaymentProcessed',
        occurredOn: new Date(),
        payload: {
          orderId: id,
          paymentId,
          amount: req.body.amount || 0,
          status: paymentSuccessful ? 'success' : 'failed',
          processedAt: new Date()
        }
      };
      
      const published = await this.publisher.publishEvent(event);
      
      if (!published) {
        throw new Error('Failed to publish payment processed event');
      }
      
      res.status(200).json({
        message: `Payment processing ${paymentSuccessful ? 'successful' : 'failed'}`,
        orderId: id,
        paymentId,
        status: paymentSuccessful ? 'completed' : 'failed'
      });
    } catch (error) {
      logger.error('Error processing payment:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }
}