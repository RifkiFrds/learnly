import { AppError } from '../../lib/app-error';
import { healthRepository } from './health.repository';

export interface HealthStatus {
  status: 'ok';
  db: 'connected';
}

export const healthService = {
  async check(): Promise<HealthStatus> {
    try {
      await healthRepository.pingDatabase();
    } catch (err) {
      console.error('[health] Database tidak dapat dihubungi:', (err as Error).message);
      throw new AppError('SERVICE_UNAVAILABLE', 'Database tidak terhubung', 503, [
        { field: 'db', message: 'disconnected' },
      ]);
    }
    return { status: 'ok', db: 'connected' };
  },
};
