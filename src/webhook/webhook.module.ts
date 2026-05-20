import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { MetaLeadAdsRouterService } from './meta-lead-ads-router.service';
import { MetaLeadAdsService } from './meta-lead-ads.service';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [HttpModule, RabbitmqModule],
  controllers: [WebhookController],
  providers: [WebhookService, MetaLeadAdsService, MetaLeadAdsRouterService],
})
export class WebhookModule {}
