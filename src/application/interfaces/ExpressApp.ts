import express from 'express';
import { createRabbitMQConnection, logger } from '../../config/rabbitmq';
import { MessagePublisher } from '../../infrastructure/messaging/publisher/MessagePublisher';
import { MessageSubscriber } from '../../infrastructure/messaging/subscriber/MessageSubscriber';
import { OrderEventHandler } from '../../infrastructure/handlers/OrderEventHandler';
import { OrderService } from '../services/OrderService';
import { OrderController } from './controllers/OrderController';
import { DLQController } from './controllers/DLQController';

export class ExpressApp {
  private app: express.Application;
  private port: number;
  
  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
  }
  
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Middleware para logging de requisições
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });
  }
  
  async setupRoutes(): Promise<void> {
    try {
      // Conectar ao RabbitMQ
      const { connection, channel } = await createRabbitMQConnection();
      
      // Inicializar serviços
      const orderService = new OrderService();
      
      // Inicializar publisher e subscriber
      const publisher = new MessagePublisher(channel);
      const orderEventHandler = new OrderEventHandler(orderService);
      const subscriber = new MessageSubscriber(channel, orderEventHandler);
      
      // Iniciar o consumo de mensagens
      await subscriber.subscribe();
      
      // Criar roteador API
      const apiRouter = express.Router();
      
      // Configurar controladores
      const orderController = new OrderController(publisher, orderService);
      const dlqController = new DLQController(subscriber);
      
      // Configurar rotas
      orderController.setupRoutes(apiRouter);
      dlqController.setupRoutes(apiRouter);
      
      // Registrar roteador na aplicação
      this.app.use('/api', apiRouter);
      
      // Rota básica
      this.app.get('/', (req, res) => {
        res.json({
          message: 'E-commerce EDA API is running',
          documentation: '/api/docs'
        });
      });
      
      // Middleware para tratamento de erros
      this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
      
      // Middleware para rotas não encontradas
      this.app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
      });
      
      // Adicionar um gancho para fechamento de conexão quando a aplicação for encerrada
      process.on('SIGINT', async () => {
        try {
          logger.info('Closing connections...');
          await channel.close();
          await connection.close();
          logger.info('Connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error closing connections:', error);
          process.exit(1);
        }
      });
    } catch (error) {
      logger.error('Error setting up routes:', error);
      throw error;
    }
  }
  
  async start(): Promise<void> {
    try {
      await this.setupRoutes();
      
      this.app.listen(this.port, () => {
        logger.info(`Server started on port ${this.port}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}