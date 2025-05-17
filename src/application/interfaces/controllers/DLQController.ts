import express, { Request, Response } from 'express';
import { MessageSubscriber } from '../../../infrastructure/messaging/subscriber/MessageSubscriber';
import { logger } from '../../../config/rabbitmq.ts';

export class DLQController {
  private subscriber: MessageSubscriber;

  constructor(subscriber: MessageSubscriber) {
    this.subscriber = subscriber;
  }

  setupRoutes(router: express.Router): void {
    router.get('/dlq/status', this.getDLQStatus.bind(this));
    router.post('/dlq/reprocess', this.reprocessDLQMessages.bind(this));
  }

  async getDLQStatus(req: Request, res: Response): Promise<void> {
    try {
      const messageCount = await this.subscriber.monitorDLQ();
      
      res.status(200).json({
        messageCount,
        status: messageCount > 0 ? 'Messages in DLQ require attention' : 'DLQ is empty'
      });
    } catch (error) {
      logger.error('Error getting DLQ status:', error);
      res.status(500).json({ error: 'Failed to get DLQ status' });
    }
  }

  async reprocessDLQMessages(req: Request, res: Response): Promise<void> {
    try {
      const count = req.body.count || 1;
      
      if (typeof count !== 'number' || count < 1) {
        res.status(400).json({ error: 'Count must be a positive number' });
        return;
      }
      
      const processedCount = await this.subscriber.reprocessDLQMessages(count);
      
      res.status(200).json({
        processedCount,
        message: `Reprocessed ${processedCount} messages from DLQ`
      });
    } catch (error) {
      logger.error('Error reprocessing DLQ messages:', error);
      res.status(500).json({ error: 'Failed to reprocess DLQ messages' });
    }
  }
}