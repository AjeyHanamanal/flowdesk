import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`FlowDesk API running on port ${config.port}`);
  logger.info(`Swagger docs: http://localhost:${config.port}/api/docs`);
});

export default app;
