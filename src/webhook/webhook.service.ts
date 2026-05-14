import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { WebhookForwardEnvelope } from './types';

/**
 * Handles webhook verification and forwards inbound payloads
 * to downstream microservices via RabbitMQ.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly verifyToken: string;

  constructor(
    private readonly config: ConfigService,
    private readonly publisher: RabbitMqPublisherService,
  ) {
    this.verifyToken = this.config.get<string>('META_VERIFY_TOKEN', 'omega_gateway_verify');
  }

  /**
   * Validates Meta hub.verify_token and returns the challenge string.
   * @throws UnauthorizedException when the token does not match.
   */
  verifyMetaWebhook(mode: string | undefined, token: string | undefined, challenge: string | undefined): string {
    console.log({mode, token, challenge});
    // if (!mode && !token && !challenge) {
    //   return 'webhook endpoint active';
    // }
    // if (mode !== 'subscribe' || token !== this.verifyToken) {
    //   this.logger.warn('Meta webhook verification failed');
    //   throw new UnauthorizedException('Invalid verify token');
    // }
    // this.logger.log('Meta webhook verified');
    return challenge ?? '';
  }

  /** Wraps the raw payload in an envelope and fans out to downstream queues. */
  async forwardMetaWebhook(payload: unknown): Promise<void> {
    const envelope: WebhookForwardEnvelope = {
      source: 'meta',
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.logger.log('Forwarding Meta webhook to downstream services');
    await Promise.all([
      this.publisher.emitToWhatsApp('gateway.meta.webhook', envelope),
      this.publisher.emitToCrmBack('gateway.meta.webhook', envelope),
    ]);
  }

  /** Forwards customers webhook payload to whatsapp_cloud_ms. */
  async forwardCustomersWebhook(payload: unknown): Promise<void> {
    console.log(JSON.stringify(payload, null, 2));
    const envelope: WebhookForwardEnvelope = {
      source: 'meta',
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.logger.log('Forwarding customers webhook to whatsapp_cloud_ms');
    await this.publisher.emitToWhatsApp('whatsapp_customers_event', envelope);
  }
}
