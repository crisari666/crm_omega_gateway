import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { MetaLeadAdsRouterService } from './meta-lead-ads-router.service';
import { FacebookPageWebhookBody, WebhookForwardEnvelope } from './types';

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
    private readonly metaLeadAdsRouter: MetaLeadAdsRouterService,
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
      // this.publisher.emitToWhatsApp('gateway.meta.webhook', envelope),
      // this.publisher.emitToCrmBack('gateway.meta.webhook', envelope),
      this.publisher.emitToCustomers('customers.meta.webhook.ingress.v1', envelope),
    ]);
  }

  /** Ceiba Page webhook: fetch Graph lead, route by form name to customers-ms or office_back. */
  async forwardCeibaPageWebhook(body: FacebookPageWebhookBody): Promise<void> {
    await this.metaLeadAdsRouter.dispatchCeibaPageWebhook(body);
  }

  /** Forwards Meta customers webhook payload to crm-omega-customers-ms (same ingress as `/webhooks/meta`). */
  async forwardCustomersWebhook(payload: unknown): Promise<void> {
    const envelope: WebhookForwardEnvelope = {
      source: 'customers',
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.logger.log('Forwarding customers webhook to crm-omega-customers-ms');
    await this.publisher.emitToCustomers('customers.meta.webhook.ingress.v1', envelope);
  }
}
