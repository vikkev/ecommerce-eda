import dotenv from 'dotenv';
import * as amqp from 'amqplib';
import winston from 'winston';

dotenv.config();

// Configuração do logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Interface para a configuração do RabbitMQ
export interface RabbitMQConfig {
  url: string;
  exchangeName: string;
  exchangeType: string;
  queueName: string;
  dlxExchangeName: string;
  dlqName: string;
  retryCount: number;
  retryDelay: number;
}

// Configuração do RabbitMQ
export const rabbitConfig: RabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost',
  exchangeName: 'ecommerce_exchange',
  exchangeType: 'direct',
  queueName: 'orders_queue',
  dlxExchangeName: 'dlx_ecommerce_exchange',
  dlqName: 'orders_dlq',
  retryCount: 3,
  retryDelay: 1000 // em milissegundos
};

// Tipo para o retorno da conexão
export interface RabbitMQConnection {
  connection: any; // Using any to bypass type checking for now
  channel: any;
}

// Criação da conexão com RabbitMQ
export async function createRabbitMQConnection(): Promise<RabbitMQConnection> {
  try {
    const connection = await amqp.connect(rabbitConfig.url);
    const channel = await connection.createChannel();
    
    // Declaração da exchange de Dead Letter
    await channel.assertExchange(rabbitConfig.dlxExchangeName, 'direct', { durable: true });
    
    // Declaração da fila de Dead Letter
    await channel.assertQueue(rabbitConfig.dlqName, { durable: true });
    
    // Binding da DLQ com a DLX
    await channel.bindQueue(
      rabbitConfig.dlqName,
      rabbitConfig.dlxExchangeName,
      rabbitConfig.queueName // Routing key igual ao nome da fila original
    );
    
    // Declaração da exchange principal
    await channel.assertExchange(rabbitConfig.exchangeName, rabbitConfig.exchangeType, { durable: true });
    
    // Declaração da fila principal com configuração para Dead Letter
    await channel.assertQueue(rabbitConfig.queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': rabbitConfig.dlxExchangeName,
        'x-dead-letter-routing-key': rabbitConfig.queueName,
      }
    });
    
    // Binding da fila principal com a exchange principal
    await channel.bindQueue(
      rabbitConfig.queueName,
      rabbitConfig.exchangeName,
      rabbitConfig.queueName
    );
    
    logger.info('RabbitMQ connection established successfully');
    return { connection, channel };
  } catch (error) {
    logger.error('Error establishing RabbitMQ connection:', error);
    throw error;
  }
}