import { Order } from '../entities/Order';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredOn: Date;
  payload: any;
}

export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: {
    order: Order;
  };
}

export interface OrderStatusChangedEvent extends DomainEvent {
  eventType: 'OrderStatusChanged';
  payload: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    changedAt: Date;
  };
}

export interface OrderPaymentProcessedEvent extends DomainEvent {
  eventType: 'OrderPaymentProcessed';
  payload: {
    orderId: string;
    paymentId: string;
    amount: number;
    status: 'success' | 'failed';
    processedAt: Date;
  };
}

export type EcommerceEvent = OrderCreatedEvent | OrderStatusChangedEvent | OrderPaymentProcessedEvent;