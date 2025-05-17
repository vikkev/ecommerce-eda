import { Channel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { logger, rabbitConfig } from '../../../config/rabbitmq';
import { DomainEvent,EcommerceEvent } from '../../../domain/events/Events';

export class MessagePublisher {
  private channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async publishEvent<T extends DomainEvent>(event: T): Promise<boolean> {
    try {
      // Definir uma routing key com base no tipo de evento
      const routingKey = rabbitConfig.queueName;

      // Publicar a mensagem
      const result = this.channel.publish(
        rabbitConfig.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          messageId: uuidv4(),
          timestamp: new Date().getTime(),
          contentType: 'application/json',
          headers: {
            eventType: event.eventType
          }
        }
      );

      if (result) {
        logger.info(`Event published successfully: ${event.eventType}`, { eventId: event.eventId });
      } else {
        logger.warn(`Failed to publish event: ${event.eventType}`, { eventId: event.eventId });
      }

      return result;
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  // Helper para criar um evento de ordem criada
  async createOrderCreatedEvent(order: any): Promise<boolean> {
    const event: EcommerceEvent = {
      eventId: uuidv4(),
      eventType: 'OrderCreated',
      occurredOn: new Date(),
      payload: { order }
    };

    return this.publishEvent(event);
  }

  // Helper para criar um evento de mudança de status da ordem
  async createOrderStatusChangedEvent(
    orderId: string, 
    previousStatus: string, 
    newStatus: string
  ): Promise<boolean> {
    const event: EcommerceEvent = {
      eventId: uuidv4(),
      eventType: 'OrderStatusChanged',
      occurredOn: new Date(),
      payload: {
        orderId,
        previousStatus,
        newStatus,
        changedAt: new Date()
      }
    };

    return this.publishEvent(event);
  }
}