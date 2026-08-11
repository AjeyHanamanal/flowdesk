import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`FlowDesk API running on port ${config.port}`);
  logger.info(`API docs available at /api/docs`);
});

export default app;
