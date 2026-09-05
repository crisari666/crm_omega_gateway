import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  FacebookLeadFieldRow,
  FacebookAdCampaignGraphResponse,
  FacebookLeadFormGraphResponse,
  FacebookLeadFormMeta,
  FacebookLeadGraphPayload,
  FacebookLeadGraphResponse,
  MetaLeadgenContact,
} from './types/meta-lead-ads.type';

const FACEBOOK_GRAPH_API_VERSION = 'v25.0';
const FACEBOOK_LEAD_FIELDS = 'created_time,field_data,platform,ad_id,form_id,campaign_id,campaign_name';
const FACEBOOK_LEAD_FORM_FIELDS = 'name,status,locale';
const FACEBOOK_AD_CAMPAIGN_FIELDS = 'name,adset{id,name,campaign{id,name}}';

export type MetaLeadGraphFetchResult = {
  readonly leadgenId: string;
  readonly mappedFields: Record<string, string>;
  readonly graph: FacebookLeadGraphPayload;
  readonly contact: MetaLeadgenContact;
};

/**
 * Fetches Meta Lead Ads payloads from Graph API using the Ceiba page token.
 */
@Injectable()
export class MetaLeadAdsService {
  private readonly logger = new Logger(MetaLeadAdsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async fetchLeadByLeadgenId(params: {
    readonly leadgenId: string;
    readonly fallbackFormId?: string;
    readonly fallbackAdId?: string;
  }): Promise<MetaLeadGraphFetchResult> {
    const accessToken = this.resolveCeibaAccessToken();
    const url = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${params.leadgenId}`;
    const response = await firstValueFrom(
      this.httpService.get<FacebookLeadGraphResponse>(url, {
        params: {
          access_token: accessToken,
          fields: FACEBOOK_LEAD_FIELDS,
        },
      }),
    );

    const data = response.data;
    if (data.error) {
      throw new UnprocessableEntityException(data.error.message ?? 'Meta Graph API error');
    }
    const adIdFromWebhook = params.fallbackAdId?.trim() ?? '';
    const adIdFromLead = data.ad_id?.trim() ?? '';
    const effectiveAdId = adIdFromWebhook.length > 0 ? adIdFromWebhook : adIdFromLead;
    const campaignNameFromAd =
      effectiveAdId.length > 0
        ? await this.fetchCampaignNameByAdId(effectiveAdId, accessToken)
        : undefined;
    console.log(JSON.stringify({campaignNameFromAd, data}, null, 2));
    const resolvedCampaignName = this.resolveCampaignName(campaignNameFromAd, data.campaign_name);
    const mappedFields = this.mergeGraphScalarsIntoMappedFields(
      data,
      this.mapLeadFields(data.field_data),
      resolvedCampaignName,
    );
    const formIdFromLead = data.form_id?.trim() ?? '';
    const formIdFallback = params.fallbackFormId?.trim() ?? '';
    const effectiveFormId = formIdFromLead.length > 0 ? formIdFromLead : formIdFallback;
    const formMeta =
      effectiveFormId.length > 0
        ? await this.fetchLeadFormMetaByFormId(effectiveFormId, accessToken)
        : undefined;
    const graph: FacebookLeadGraphPayload = {
      fieldData: data.field_data ?? [],
      adId: effectiveAdId.length > 0 ? effectiveAdId : data.ad_id,
      formId: data.form_id ?? (formIdFallback.length > 0 ? formIdFallback : undefined),
      createdTime: data.created_time,
      platform: data.platform,
      campaignName: resolvedCampaignName,
      ...(formMeta != null ? { form: formMeta } : {}),
    };
    const platform = this.resolveGraphPlatform(graph, mappedFields);
    return {
      leadgenId: params.leadgenId,
      mappedFields,
      graph: { ...graph, ...(platform != null ? { platform } : {}) },
      contact: this.extractContactFromMappedFields(mappedFields),
    };
  }

  private resolveGraphPlatform(
    graph: Pick<FacebookLeadGraphPayload, 'platform'>,
    mappedFields: Record<string, string>,
  ): string | undefined {
    const fromGraph = graph.platform?.trim();
    if (fromGraph != null && fromGraph.length > 0) {
      return fromGraph;
    }
    const lookup = this.buildNormalizedFieldLookup(mappedFields);
    for (const key of ['platform', 'lead_platform', 'plataforma']) {
      const raw = lookup[key];
      if (raw != null && raw.length > 0) {
        return raw.trim();
      }
    }
    return undefined;
  }

  resolveRouteTarget(
    formName: string | undefined,
  ): 'customers' | 'referidos' | 'webinar' | 'unknown' {
    const normalized = (formName ?? '').trim().toLowerCase();
    if (normalized.startsWith('datos_clientes')) {
      return 'customers';
    }
    if (normalized.startsWith('datos_referidos')) {
      return 'referidos';
    }
    if (normalized.startsWith('formulario_masterclass')) {
      return 'webinar';
    }
    return 'unknown';
  }

  private resolveCeibaAccessToken(): string {
    const isDev = this.readIsDevMode();
    const envKey = isDev ? 'FB_BUSINESS_CEIBA_TOKEN' : 'FB_BUSINESS_CEIBA_TOKEN_PROD';
    const accessToken = this.configService.get<string>(envKey)?.trim();
    if (!accessToken) {
      throw new InternalServerErrorException(`${envKey} is not configured`);
    }
    return accessToken;
  }

  private readIsDevMode(): boolean {
    const raw = this.configService.get<string>('IS_DEV', 'true');
    if (raw == null) {
      return false;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private resolveCampaignName(
    campaignNameFromAd: string | undefined,
    campaignNameFromLead: string | undefined,
  ): string | undefined {
    const fromAd = campaignNameFromAd?.trim();
    if (fromAd != null && fromAd.length > 0) {
      return fromAd;
    }
    const fromLead = campaignNameFromLead?.trim();
    if (fromLead != null && fromLead.length > 0) {
      return fromLead;
    }
    return undefined;
  }

  private async fetchCampaignNameByAdId(
    adId: string,
    accessToken: string,
  ): Promise<string | undefined> {
    const trimmed = adId.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    try {
      const url = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${trimmed}`;
      const response = await firstValueFrom(
        this.httpService.get<FacebookAdCampaignGraphResponse>(url, {
          params: {
            access_token: accessToken,
            fields: FACEBOOK_AD_CAMPAIGN_FIELDS,
          },
        }),
      );
      const data = response.data;
      if (data.error) {
        this.logger.warn(
          `fetchCampaignNameByAdId adId=${trimmed}: ${data.error.message ?? 'Graph error'}`,
        );
        return undefined;
      }
      const name = data.campaign?.name?.trim();
      if (name == null || name.length === 0) {
        return undefined;
      }
      return name;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(JSON.stringify({response: err.response.data}, null, 2));
      this.logger.warn(`fetchCampaignNameByAdId adId=${trimmed}: ${message}`);
      return undefined;
    }
  }

  private async fetchLeadFormMetaByFormId(
    formId: string,
    accessToken: string,
  ): Promise<FacebookLeadFormMeta | undefined> {
    const trimmed = formId.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    try {
      const url = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${trimmed}`;
      const response = await firstValueFrom(
        this.httpService.get<FacebookLeadFormGraphResponse>(url, {
          params: {
            access_token: accessToken,
            fields: FACEBOOK_LEAD_FORM_FIELDS,
          },
        }),
      );
      const data = response.data;

      if (data.error) {
        this.logger.warn(
          `fetchLeadFormMetaByFormId formId=${trimmed}: ${data.error.message ?? 'Graph error'}`,
        );
        return undefined;
      }
      const statusRaw = data.status;
      const status =
        typeof statusRaw === 'string'
          ? statusRaw
          : statusRaw != null
            ? String(statusRaw)
            : undefined;
      const meta: FacebookLeadFormMeta = {
        name: data.name,
        status,
        locale: data.locale,
      };
      if (meta.name == null && meta.status == null && meta.locale == null) {
        return undefined;
      }
      return meta;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`fetchLeadFormMetaByFormId formId=${trimmed}: ${message}`);
      return undefined;
    }
  }

  /**
   * Merges top-level Graph lead scalars (e.g. campaign_name) into mappedFields for downstream persistence.
   */
  private mergeGraphScalarsIntoMappedFields(
    data: FacebookLeadGraphResponse,
    mappedFields: Record<string, string>,
    resolvedCampaignName?: string,
  ): Record<string, string> {
    const merged: Record<string, string> = { ...mappedFields };
    const campaignName =
      resolvedCampaignName?.trim() ?? data.campaign_name?.trim();
    if (campaignName != null && campaignName.length > 0) {
      merged.campaign_name = campaignName;
    }
    const platform = data.platform?.trim();
    if (platform != null && platform.length > 0) {
      merged.platform = platform;
    }
    const adId = data.ad_id?.trim();
    if (adId != null && adId.length > 0) {
      merged.ad_id = adId;
    }
    const formId = data.form_id?.trim();
    if (formId != null && formId.length > 0) {
      merged.form_id = formId;
    }
    const createdTime = data.created_time?.trim();
    if (createdTime != null && createdTime.length > 0) {
      merged.created_time = createdTime;
    }
    return merged;
  }

  private mapLeadFields(fieldData: readonly FacebookLeadFieldRow[] | undefined): Record<string, string> {
    if (!fieldData?.length) {
      return {};
    }
    return fieldData.reduce<Record<string, string>>((accumulator, field) => {
      if (!field.name) {
        return accumulator;
      }
      const values = Array.isArray(field.values)
        ? field.values.filter((value): value is string => typeof value === 'string' && value.length > 0)
        : [];
      // Persist every form question key; empty when Meta omits values (e.g. inbox_url).
      accumulator[field.name] = values.length > 0 ? values.join(', ') : '';
      return accumulator;
    }, {});
  }

  private buildNormalizedFieldLookup(mapped: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(mapped).map(([key, value]) => [key.trim().toLowerCase(), value.trim()]),
    );
  }

  private extractPhoneDigitsFromMapped(mapped: Record<string, string>): string {
    const lookup = this.buildNormalizedFieldLookup(mapped);
    const directKeys = [
      'phone_number',
      'phone',
      'mobile_phone',
      'cell_phone',
      'teléfono',
      'telefono',
      'número_de_teléfono',
      'numero_de_telefono',
    ];
    for (const key of directKeys) {
      const raw = lookup[key];
      if (raw != null && raw.length > 0) {
        return raw.replace(/\D/g, '');
      }
    }
    for (const [key, value] of Object.entries(lookup)) {
      if (/phone|tel|cel|movil|mobile/i.test(key) && value.length > 0) {
        return value.replace(/\D/g, '');
      }
    }
    return '';
  }

  private extractContactFromMappedFields(mapped: Record<string, string>): MetaLeadgenContact {
    const lookup = this.buildNormalizedFieldLookup(mapped);
    let name = lookup['first_name'] ?? lookup['nombre'] ?? '';
    let lastName = lookup['last_name'] ?? lookup['apellido'] ?? '';
    const fullName = lookup['full_name'] ?? lookup['nombre_completo'];
    if (fullName != null && fullName.length > 0) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (name.length === 0 && parts.length > 0) {
        name = parts[0] ?? '';
      }
      if (lastName.length === 0 && parts.length > 1) {
        lastName = parts.slice(1).join(' ');
      }
    }
    if (name.length === 0) {
      name = lookup['name'] ?? 'Lead';
    }
    let email = '';
    for (const [key, value] of Object.entries(lookup)) {
      if ((key.includes('email') || key === 'correo' || key.includes('correo')) && value.includes('@')) {
        email = value;
        break;
      }
    }
    const phoneDigits = this.extractPhoneDigitsFromMapped(mapped);
    return { name, lastName, email, phoneDigits };
  }
}
