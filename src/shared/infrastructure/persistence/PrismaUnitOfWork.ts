import { IUnitOfWork } from '../../application/IUnitOfWork';
import { logger } from '../config/Logger';

export class PrismaUnitOfWork implements IUnitOfWork {
  async beginTransaction(): Promise<void> {
    logger.debug('Transaction started');
  }

  async commit(): Promise<void> {
    logger.debug('Transaction committed');
  }

  async rollback(): Promise<void> {
    logger.debug('Transaction rolled back');
  }
}
