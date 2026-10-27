import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** What a test load policy says; anything left out is the design's example. */
export interface LoadPolicyOptions {
  isEnabled?: boolean;
  limitKw?: number;
  strategy?: 'equal_share' | 'priority';
  minPowerKw?: number;
}

/** What a test chat channel says. */
export interface MessagingChannelOptions {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  accessToken?: string;
  greeting?: string;
  isActive?: boolean;
}

/**
 * Module 17's rows for tests: a site's load policy and a charger's priority, a tenant's chat
 * channel and its conversations, and the charger states the jobs look at (online, plugged in).
 */
export class TestAddons {
  constructor(private readonly data: TestData) {}

  async loadPolicy(tenantId: string, siteId: string, options: LoadPolicyOptions = {}) {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into site_load_policies (id, tenant_id, site_id, is_enabled, limit_kw, strategy, min_power_kw)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        tenantId,
        siteId,
        options.isEnabled ?? true,
        options.limitKw ?? 30,
        options.strategy ?? 'equal_share',
        options.minPowerKw ?? 4.2,
      ],
    );
    return id;
  }

  async chargerLoadSettings(
    tenantId: string,
    chargerId: string,
    settings: { priority?: number; maxPowerKw?: number | null },
  ) {
    await this.data.sql(
      `insert into charger_load_settings (id, tenant_id, charger_id, priority, max_power_kw)
       values ($1, $2, $3, $4, $5)`,
      [UuidV7.create(), tenantId, chargerId, settings.priority ?? 5, settings.maxPowerKw ?? null],
    );
  }

  /** A gateway holds the charger's socket for the next minute, and the charger has booted. */
  async chargerOnline(tenantId: string, chargerId: string): Promise<void> {
    await this.data.sql(
      `insert into charger_connections (charger_id, tenant_id, instance_id, connection_id, ocpp_version, is_booted, lease_expires_at)
       values ($1, $2, 'gateway-1:1', $3, '1.6', true, now() + interval '1 minute')
       on conflict (charger_id) do update set lease_expires_at = now() + interval '1 minute'`,
      [chargerId, tenantId, `c-${chargerId.slice(-6)}`],
    );
    await this.data.sql(
      'update chargers set last_boot_at = coalesce(last_boot_at, now()) where id = $1',
      [chargerId],
    );
  }

  async chargerOffline(chargerId: string): Promise<void> {
    await this.data.sql('delete from charger_connections where charger_id = $1', [chargerId]);
  }

  /** The charger booted again just now. */
  async chargerBooted(chargerId: string, at: Date = new Date()): Promise<void> {
    await this.data.sql('update chargers set last_boot_at = $2 where id = $1', [chargerId, at]);
  }

  async connectorStatus(connectorId: string, status: string): Promise<void> {
    await this.data.sql(
      'update connectors set status = $2, status_changed_at = now() where id = $1',
      [connectorId, status],
    );
  }

  async messagingChannel(tenantId: string, options: MessagingChannelOptions = {}) {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into messaging_channels (id, tenant_id, provider, phone_number_id, display_phone_number, access_token, greeting, is_active)
       values ($1, $2, 'whatsapp', $3, $4, $5, $6, $7)`,
      [
        id,
        tenantId,
        options.phoneNumberId ?? `pn-${id.slice(-8)}`,
        options.displayPhoneNumber ?? '+44 7700 900000',
        options.accessToken ?? '',
        options.greeting ?? '',
        options.isActive ?? true,
      ],
    );
    return id;
  }

  /** A conversation with a driver, optionally already tied to a charge. */
  async conversation(
    tenantId: string,
    channelId: string,
    contact: string,
    link: { sessionId?: string; chargeKey?: string; chargerId?: string; connectorId?: string } = {},
  ) {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into messaging_conversations (id, tenant_id, channel_id, contact, charger_id, connector_id, session_id, charge_key, link_token, last_inbound_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [
        id,
        tenantId,
        channelId,
        contact,
        link.chargerId ?? null,
        link.connectorId ?? null,
        link.sessionId ?? null,
        link.chargeKey ?? null,
        `lt-${id.slice(-12)}`,
      ],
    );
    return id;
  }
}
