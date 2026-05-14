import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

/**
 * Centralized RabbitMQ publisher for outbound messages.
 * Inject this service to emit or send messages to downstream queues.
 */
@Injectable()
export class RabbitMqPublisherService implements OnModuleInit {
  constructor(
    @Inject('WS_MS_QUEUE') private readonly wsMsClient: ClientProxy,
    @Inject('CRM_BACK_QUEUE') private readonly crmBackClient: ClientProxy,
    @Inject('CRM_CUSTOMERS_QUEUE') private readonly crmCustomersClient: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.wsMsClient.connect(),
      this.crmBackClient.connect(),
      this.crmCustomersClient.connect(),
    ]);
  }

  /** Fire-and-forget event to whatsapp_cloud_ms */
  async emitToWhatsApp(pattern: string, data: unknown): Promise<void> {
    await lastValueFrom(this.wsMsClient.emit(pattern, data));
  }

  /** RPC to whatsapp_cloud_ms (returns response) */
  async sendToWhatsApp<T = unknown>(pattern: string, data: unknown): Promise<T> {
    return lastValueFrom(this.wsMsClient.send<T>(pattern, data));
  }

  /** Fire-and-forget event to omega_office_back */
  async emitToCrmBack(pattern: string, data: unknown): Promise<void> {
    await lastValueFrom(this.crmBackClient.emit(pattern, data));
  }

  /** RPC to omega_office_back */
  async sendToCrmBack<T = unknown>(pattern: string, data: unknown): Promise<T> {
    return lastValueFrom(this.crmBackClient.send<T>(pattern, data));
  }

  /** Fire-and-forget event to crm-omega-customers-ms */
  async emitToCustomers(pattern: string, data: unknown): Promise<void> {
    await lastValueFrom(this.crmCustomersClient.emit(pattern, data));
  }

  /** RPC to crm-omega-customers-ms */
  async sendToCustomers<T = unknown>(pattern: string, data: unknown): Promise<T> {
    return lastValueFrom(this.crmCustomersClient.send<T>(pattern, data));
  }
}
