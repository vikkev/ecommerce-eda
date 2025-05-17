import { Channel, ConsumeMessage } from 'amqplib';
import { logger, rabbitConfig } from '../../../config/rabbitmq';
import { EcommerceEvent } from '../../../domain/events/Events';

export interface MessageHandler {
  handleMessage(event: EcommerceEvent): Promise<void>;
}

export class MessageSubscriber {
  private channel: Channel;
  private handler: MessageHandler;
  private processingErrors: Map<string, number> = new Map();

  constructor(channel: Channel, handler: MessageHandler) {
    this.channel = channel;
    this.handler = handler;
  }

  async subscribe(): Promise<void> {
    try {
      // Começar a consumir mensagens da fila
      await this.channel.consume(
        rabbitConfig.queueName,
        (msg) => this.processMessage(msg),
        { noAck: false }
      );

      logger.info(`Subscribed to queue: ${rabbitConfig.queueName}`);
    } catch (error) {
      logger.error('Error subscribing to queue:', error);
      throw error;
    }
  }

  private async processMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) {
      return;
    }

    const messageId = msg.properties.messageId;
    let event: EcommerceEvent;

    try {
      // Parsear o conteúdo da mensagem
      const content = msg.content.toString();
      event = JSON.parse(content) as EcommerceEvent;

      logger.info(`Processing message: ${messageId}`, { eventType: event.eventType });

      // Processar a mensagem
      await this.handler.handleMessage(event);

      // Confirmar o processamento da mensagem
      this.channel.ack(msg);
      
      // Se processou com sucesso, remover do mapa de erros se existir
      this.processingErrors.delete(messageId);
      
      logger.info(`Message processed successfully: ${messageId}`);
    } catch (error) {
      // Tratar erro de processamento
      this.handleProcessingError(msg, messageId, error);
    }
  }

  private handleProcessingError(msg: ConsumeMessage, messageId: string, error: any): void {
    // Verificar o número de tentativas para esta mensagem
    const currentRetries = this.processingErrors.get(messageId) || 0;
    
    if (currentRetries < rabbitConfig.retryCount) {
      // Incrementar o contador de tentativas
      this.processingErrors.set(messageId, currentRetries + 1);

      // Rejeitar a mensagem para reentrega após um delay
      setTimeout(() => {
        this.channel.nack(msg, false, true); // requeue=true para tentar novamente
        logger.warn(`Message requeued for retry: ${messageId}`, { 
          retryCount: currentRetries + 1,
          error: error.message
        });
      }, rabbitConfig.retryDelay);
    } else {
      // Excedeu o número de tentativas, enviar para DLQ
      this.channel.nack(msg, false, false); // requeue=false para não tentar novamente (vai para DLQ)
      this.processingErrors.delete(messageId); // Limpar do mapa de controle
      
      logger.error(`Message sent to DLQ after ${rabbitConfig.retryCount} failed attempts: ${messageId}`, { 
        error: error.message
      });
    }
  }

  // Método para monitorar a DLQ
  async monitorDLQ(): Promise<number> {
    try {
      const queueInfo = await this.channel.checkQueue(rabbitConfig.dlqName);
      const messageCount = queueInfo.messageCount;
      
      logger.info(`Current DLQ message count: ${messageCount}`);
      return messageCount;
    } catch (error) {
      logger.error('Error checking DLQ:', error);
      throw error;
    }
  }

  // Método para reprocessar mensagens da DLQ
  async reprocessDLQMessages(count: number = 1): Promise<number> {
    try {
      let processedCount = 0;

      for (let i = 0; i < count; i++) {
        const msg = await this.channel.get(rabbitConfig.dlqName, { noAck: false });
        if (!msg) {
          break; // Não há mais mensagens na DLQ
        }

        // Republica a mensagem na fila original
        this.channel.publish(
          rabbitConfig.exchangeName,
          rabbitConfig.queueName,
          msg.content,
          msg.properties
        );

        // Confirma o processamento da mensagem na DLQ
        this.channel.ack(msg);
        processedCount++;
      }

      logger.info(`Reprocessed ${processedCount} messages from DLQ`);
      return processedCount;
    } catch (error) {
      logger.error('Error reprocessing messages from DLQ:', error);
      throw error;
    }
  }
}