export interface WebhookEntry {
  readonly id: string;
  readonly time: number;
  readonly changes?: readonly WebhookChange[];
  readonly messaging?: readonly unknown[];
}

export interface WebhookChange {
  readonly field: string;
  readonly value: unknown;
}

export interface MetaWebhookPayload {
  readonly object: string;
  readonly entry: readonly WebhookEntry[];
}

export interface WebhookForwardEnvelope {
  readonly source: 'meta';
  readonly receivedAt: string;
  readonly payload: unknown;
}
