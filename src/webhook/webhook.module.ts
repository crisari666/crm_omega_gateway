import { Module } from '@nestjs/common';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [RabbitmqModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
