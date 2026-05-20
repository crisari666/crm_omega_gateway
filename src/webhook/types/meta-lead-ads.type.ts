export type FacebookLeadFieldRow = {
  readonly name: string;
  readonly values?: readonly string[];
};

export type FacebookLeadGraphResponse = {
  readonly id?: string;
  readonly field_data?: FacebookLeadFieldRow[];
  readonly ad_id?: string;
  readonly form_id?: string;
  readonly created_time?: string;
  readonly platform?: string;
  readonly error?: {
    readonly message: string;
    readonly type?: string;
    readonly code?: number;
  };
};

export type FacebookLeadFormMeta = {
  readonly name?: string;
  readonly status?: string;
  readonly locale?: string;
};

export type FacebookLeadFormGraphResponse = {
  readonly name?: string;
  readonly status?: string;
  readonly locale?: string;
  readonly error?: {
    readonly message: string;
    readonly type?: string;
    readonly code?: number;
  };
};

export type FacebookLeadGraphPayload = {
  readonly fieldData: readonly FacebookLeadFieldRow[];
  readonly adId?: string;
  readonly formId?: string;
  readonly createdTime?: string;
  readonly platform?: string;
  readonly form?: FacebookLeadFormMeta;
};

export type FacebookLeadgenWebhookValue = {
  readonly leadgen_id?: string;
  readonly page_id?: string;
  readonly form_id?: string;
  readonly ad_id?: string;
  readonly adgroup_id?: string;
  readonly created_time?: number;
};

export type FacebookPageWebhookChange = {
  readonly field?: string;
  readonly value?: FacebookLeadgenWebhookValue;
};

export type FacebookPageWebhookEntry = {
  readonly id?: string;
  readonly changes?: readonly FacebookPageWebhookChange[];
};

export type FacebookPageWebhookBody = {
  readonly object?: string;
  readonly entry?: readonly FacebookPageWebhookEntry[];
};

export type MetaLeadgenContact = {
  readonly name: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneDigits: string;
};

export interface MetaLeadgenIngestEnvelope {
  readonly source: 'ceiba';
  readonly receivedAt: string;
  readonly leadgenId: string;
  readonly webhookValue?: FacebookLeadgenWebhookValue;
  readonly mappedFields: Record<string, string>;
  readonly graph: FacebookLeadGraphPayload;
  readonly contact: MetaLeadgenContact;
}

export type MetaLeadgenRouteTarget = 'customers' | 'referidos' | 'unknown';
