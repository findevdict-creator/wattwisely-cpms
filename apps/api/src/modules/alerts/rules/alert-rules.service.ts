import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { AlertRuleErrors } from './alert-rule-errors';
import { AlertRuleInput } from './alert-rule-record';
import { AlertRulesRepository } from './alert-rules.repository';
import { AlertRuleDto } from './dto/alert-rule.dto';
import { AlertRuleRequestDto } from './dto/alert-rule-request.dto';
import { AlertRulesDto } from './dto/alert-rules.dto';
import { ReplaceAlertRulesRequestDto } from './dto/replace-alert-rules-request.dto';

/**
 * Alert routing (story NTF-03): which roles or people hear about each alert type, per
 * site, by e-mail and in the portal. Saving replaces the whole routing; people still only
 * hear about sites where they may see alerts.
 */
@Injectable()
export class AlertRulesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly rules: AlertRulesRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async get(access: TenantAccess): Promise<AlertRulesDto> {
    const rules = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.rules.findAll(tx),
    );
    return new AlertRulesDto(rules.map((rule) => new AlertRuleDto(rule)));
  }

  async replace(auth: RequestAuth, request: ReplaceAlertRulesRequestDto): Promise<AlertRulesDto> {
    const access = auth.requireAccess();
    const account = auth.requireAccount();
    const inputs = request.rules.map((rule, index) => AlertRulesService.input(rule, index));
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      await this.requireKnown(tx, inputs);
      const before = await this.rules.findAll(tx);
      await this.rules.replace(tx, access.tenant.id, inputs, account.id);
      const after = await this.rules.findAll(tx);
      await this.audit.record(tx, auth, {
        action: 'alert_rules.replaced',
        targetType: 'alert_routing',
        targetId: access.tenant.id,
        targetLabel: 'Alert routing',
        before: { rules: before.length },
        after: { rules: after.length },
      });
      return new AlertRulesDto(after.map((rule) => new AlertRuleDto(rule)));
    });
  }

  private static input(rule: AlertRuleRequestDto, index: number): AlertRuleInput {
    const roleId = rule.role_id ?? null;
    const membershipId = rule.membership_id ?? null;
    if ((roleId === null) === (membershipId === null)) {
      throw AlertRuleErrors.invalid(index, 'give either role_id or membership_id');
    }
    if (!rule.is_email && !rule.is_in_portal) {
      throw AlertRuleErrors.invalid(index, 'choose e-mail, the portal or both');
    }
    return {
      alertType: rule.alert_type,
      siteId: rule.site_id ?? null,
      roleId,
      membershipId,
      isEmail: rule.is_email,
      isInPortal: rule.is_in_portal,
    };
  }

  /** Every site, role and member the rules name must exist in the tenant. */
  private async requireKnown(tx: Transaction, inputs: AlertRuleInput[]): Promise<void> {
    const ids = (pick: (input: AlertRuleInput) => string | null) => [
      ...new Set(inputs.map(pick).filter((id): id is string => id !== null)),
    ];
    const sites = await this.rules.existingSites(
      tx,
      ids((input) => input.siteId),
    );
    const roles = await this.rules.existingRoles(
      tx,
      ids((input) => input.roleId),
    );
    const members = await this.rules.activeMembers(
      tx,
      ids((input) => input.membershipId),
    );
    inputs.forEach((input, index) => {
      if (input.siteId && !sites.has(input.siteId)) {
        throw AlertRuleErrors.invalid(index, 'site_id is not one of your sites');
      }
      if (input.roleId && !roles.has(input.roleId)) {
        throw AlertRuleErrors.invalid(index, 'role_id is not one of your roles');
      }
      if (input.membershipId && !members.has(input.membershipId)) {
        throw AlertRuleErrors.invalid(index, 'membership_id is not a member of your team');
      }
    });
  }
}
