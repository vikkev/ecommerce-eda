import { ExpressApp } from './application/interfaces/ExpressApp';
import { logger } from './config/rabbitmq';

async function main() {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const app = new ExpressApp(port);
    
    await app.start();
    
    logger.info(`E-commerce EDA application started`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();