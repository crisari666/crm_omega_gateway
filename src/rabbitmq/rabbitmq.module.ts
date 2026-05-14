import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';

const OUTBOUND_QUEUES = [
  { name: 'WS_MS_QUEUE', queue: 'ws_ms_queue' },
  { name: 'CRM_BACK_QUEUE', queue: 'crm_back_queue' },
  { name: 'CRM_CUSTOMERS_QUEUE', queue: 'crm.customers.whatsapp_integration' },
] as const;

@Module({
  imports: [
    ClientsModule.registerAsync(
      OUTBOUND_QUEUES.map(({ name, queue }) => ({
        name,
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ as Transport.RMQ,
          options: {
            urls: [config.get<string>('rabbitmq.url')!],
            queue,
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      })),
    ),
  ],
  providers: [RabbitMqPublisherService],
  exports: [RabbitMqPublisherService],
})
export class RabbitmqModule {}
