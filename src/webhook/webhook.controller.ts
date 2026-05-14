import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { MetaWebhookQueryDto } from './dto';
import { WebhookService } from './webhook.service';

/**
 * Entry point for all inbound webhooks.
 * Receives HTTP requests from external platforms (Meta, etc.)
 * and delegates to WebhookService for verification & forwarding.
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /** Meta verification challenge (called once when subscribing the webhook). */
  @Get('customers')
  verifyMetaWebhook(@Query() query: MetaWebhookQueryDto): string {
    console.log(JSON.stringify(query, null, 2));
    return this.webhookService.verifyMetaWebhook(
      query['hub.mode'],
      query['hub.verify_token'],
      query['hub.challenge'],
    );
  }

  /** Receives all Meta webhook events and fans out to RabbitMQ. */
  @Post('meta')
  @HttpCode(HttpStatus.OK)
  async handleMetaWebhook(@Body() body: unknown): Promise<{ status: string }> {
    this.logger.log('Meta webhook received');
    await this.webhookService.forwardMetaWebhook(body);
    return { status: 'ok' };
  }

  /** Receives customers webhook events and forwards to whatsapp_cloud_ms. */
  @Post('customers')
  @HttpCode(HttpStatus.OK)
  async handleCustomersWebhook(@Body() body: unknown): Promise<{ status: string }> {
    this.logger.log('Customers webhook received');
    await this.webhookService.forwardCustomersWebhook(body);
    return { status: 'ok' };
  }

  /** Health-check / smoke test. */
  @Get('test')
  testWebhook(): { status: string } {
    return { status: 'webhook controller alive' };
  }
}
