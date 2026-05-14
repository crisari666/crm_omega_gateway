import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => {
  const user = process.env.RABBIT_MQ_USER || 'guest';
  const pass = process.env.RABBIT_MQ_PASS || 'guest';
  const host = process.env.RABBIT_MQ_HOST || 'localhost';
  const port = process.env.RABBIT_MQ_PORT || '5672';
  return {
    user,
    pass,
    host,
    port: parseInt(port, 10),
    url: `amqp://${user}:${pass}@${host}:${port}`,
  };
});
