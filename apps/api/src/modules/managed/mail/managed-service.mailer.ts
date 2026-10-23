import { Injectable, Logger } from '@nestjs/common';
import { BrandedMailLayout, MailContent } from '@wattwisely/mail';
import { ApiConfig } from '../../../config/api.config';
import { MailSender } from '../../../common/mail/mail.sender';
import { TenantBrandLookup } from '../../branding/tenant-brand.lookup';
import { OwnerContact } from './owner-contacts.repository';

/** The e-mails the managed service sends to a tenant's Owners (stories MGT-01, MGT-03, MGT-05). */
@Injectable()
export class ManagedServiceMailer {
  private readonly logger = new Logger(ManagedServiceMailer.name);

  constructor(
    private readonly config: ApiConfig,
    private readonly mailSender: MailSender,
    private readonly brands: TenantBrandLookup,
  ) {}

  /** Wattwisely offered the agreement: the Owner has to accept it in the portal. */
  offered(tenantId: string, owners: OwnerContact[], managerName: string): Promise<void> {
    return this.sendAll(tenantId, owners, {
      subject: 'Wattwisely offers to manage your charging',
      headline: 'A managed service agreement is waiting for your acceptance',
      paragraphs: [
        `Wattwisely offers to run your charging for you under a managed service agreement. ${managerName} will be your account manager.`,
        'Nothing changes until an Owner accepts the terms in the portal. Until then Wattwisely staff have no access to your account.',
      ],
      action: { label: 'Review the agreement', url: this.link() },
    });
  }

  /** Notice was given, by either side: the service ends on the date. */
  noticeGiven(tenantId: string, owners: OwnerContact[], endsAt: Date): Promise<void> {
    const date = endsAt.toISOString().slice(0, 10);
    return this.sendAll(tenantId, owners, {
      subject: `Your managed service ends on ${date}`,
      headline: `The managed service ends on ${date}`,
      paragraphs: [
        `Notice has been given on the managed service agreement. Wattwisely keeps running your charging until ${date}; on that day its staff lose access to your account and your own team takes over.`,
        'Make sure your team holds the roles it needs before then.',
      ],
      action: { label: 'Open the managed service page', url: this.link() },
    });
  }

  /** A Managed operator proposed a tariff change the Owner has to approve. */
  tariffProposed(tenantId: string, owners: OwnerContact[], proposal: { id: string; name: string }) {
    return this.sendAll(tenantId, owners, {
      subject: `Tariff change proposed: ${proposal.name}`,
      headline: `Wattwisely proposes a change to the tariff "${proposal.name}"`,
      paragraphs: [
        'Your agreement says tariff changes need your approval. The proposed prices are in the portal, where you can approve or reject them with a comment.',
      ],
      action: {
        label: 'Review the proposal',
        url: `${this.portalUrl()}/tariffs/proposals/${proposal.id}`,
      },
    });
  }

  /** A Managed operator changed a tariff; the agreement does not need the Owner's approval. */
  tariffChanged(tenantId: string, owners: OwnerContact[], tariff: { id: string; name: string }) {
    return this.sendAll(tenantId, owners, {
      subject: `Tariff changed by Wattwisely: ${tariff.name}`,
      headline: `Wattwisely changed the tariff "${tariff.name}"`,
      paragraphs: [
        'The new prices apply to sessions that start from now on. The version history in the portal shows what changed.',
      ],
      action: { label: 'Open the tariff', url: `${this.portalUrl()}/tariffs/${tariff.id}` },
    });
  }

  private async sendAll(tenantId: string, owners: OwnerContact[], content: MailContent) {
    const brand = await this.brands.load(tenantId);
    const message = BrandedMailLayout.render(brand, content);
    for (const owner of owners) {
      try {
        await this.mailSender.send({ to: owner.email, ...message });
      } catch (error) {
        this.logger.error(`E-mail to ${owner.email} failed: ${(error as Error).message}`);
      }
    }
  }

  private link(): string {
    return `${this.portalUrl()}/settings/managed-service`;
  }

  private portalUrl(): string {
    return this.config.portalUrl.replace(/\/$/, '');
  }
}
