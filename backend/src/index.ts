import app, { sessionStore } from './app';
import { config } from './config';
import prisma from './lib/prisma';

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      const deadline = setTimeout(() => process.exit(1), 25000);
      deadline.unref();
      await new Promise<void>(resolve => {
        server.close(() => resolve());
        server.closeIdleConnections();
      });
      await Promise.allSettled([prisma.$disconnect(), sessionStore?.close()]);
      clearTimeout(deadline);
      process.exit(0);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    await Promise.allSettled([prisma.$disconnect(), sessionStore?.close()]);
    process.exit(1);
  }
}

main();
