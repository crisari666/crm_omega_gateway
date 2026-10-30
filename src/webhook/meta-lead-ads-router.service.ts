import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { MetaLeadAdsService } from './meta-lead-ads.service';
import {
  FacebookPageWebhookBody,
  MetaLeadgenIngestEnvelope,
} from './types/meta-lead-ads.type';

/**
 * Processes Ceiba Page `leadgen` webhooks: Graph fetch, route by form name, emit RMQ.
 */
@Injectable()
export class MetaLeadAdsRouterService {
  private readonly logger = new Logger(MetaLeadAdsRouterService.name);

  constructor(
    private readonly metaLeadAdsService: MetaLeadAdsService,
    private readonly publisher: RabbitMqPublisherService,
  ) {}

  async dispatchCeibaPageWebhook(body: FacebookPageWebhookBody): Promise<void> {
    const entries = body.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== 'leadgen') {
          continue;
        }
        const leadgenId = change.value?.leadgen_id?.trim() ?? '';
        if (leadgenId.length === 0) {
          continue;
        }
        try {
          await this.processLeadgenChange(leadgenId, change.value);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`dispatchCeibaPageWebhook leadgenId=${leadgenId}: ${message}`);
        }
      }
    }
  }

  private async processLeadgenChange(
    leadgenId: string,
    webhookValue: MetaLeadgenIngestEnvelope['webhookValue'],
  ): Promise<void> {
    const fetched = await this.metaLeadAdsService.fetchLeadByLeadgenId({

      leadgenId,
      fallbackFormId: webhookValue?.form_id,
      fallbackAdId: webhookValue?.ad_id,
    });
    const formName = fetched.graph.form?.name;
    const route = this.metaLeadAdsService.resolveRouteTarget(formName);
    const envelope: MetaLeadgenIngestEnvelope = {
      source: 'ceiba',
      receivedAt: new Date().toISOString(),
      leadgenId,
      webhookValue,
      mappedFields: fetched.mappedFields,
      graph: fetched.graph,
      contact: fetched.contact,
    };
    // Additive: unknown prefixes still emit to customers-ms so DB form registry can match.
    // Hardcoded prefixes above stay unchanged (safety net).
    if (route === 'unknown') {
      this.logger.log(
        `Routing leadgenId=${leadgenId} to crm-omega-customers-ms (unknown form name="${formName ?? ''}"; registry may match)`,
      );
      await this.publisher.emitToCustomers('customers.meta.leadgen.ingest.v1', envelope);
      return;
    }
    if (route === 'customers') {
      this.logger.log(`Routing leadgenId=${leadgenId} to crm-omega-customers-ms (form=${formName})`);
      await this.publisher.emitToCustomers('customers.meta.leadgen.ingest.v1', envelope);
      return;
    }
    if (route === 'webinar') {
      this.logger.log(
        `Routing leadgenId=${leadgenId} to crm-omega-customers-ms webinar (form=${formName})`,
      );
      await this.publisher.emitToCustomers('customers.meta.webinar_lead.ingest.v1', envelope);
      return;
    }
    this.logger.log(
      `Routing leadgenId=${leadgenId} to omega_office_back route=${route} (form=${formName})`,
    );
    await this.publisher.emitToCrmBack('office.facebook.leadgen.ingest.v1', { ...envelope, route });
  }
}
