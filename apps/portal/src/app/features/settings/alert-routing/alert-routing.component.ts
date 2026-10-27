import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../../../core/api/alerts-api.service';
import { ApiProblem } from '../../../core/api/api-problem';
import { AlertRule, AlertRules, AlertType, AlertTypeLabels } from '../../../core/api/models/alert';
import { Member } from '../../../core/api/models/member';
import { Role } from '../../../core/api/models/role';
import { Site } from '../../../core/api/models/site';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { TeamApiService } from '../../../core/api/team-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { AlertRuleTarget } from './alert-rule-target';

/**
 * Settings > Alert routing (story NTF-03): who hears about each kind of alert, at which
 * sites, by e-mail and in the portal. Types without rules go to the default roles.
 * People only get alerts for sites they may see, whatever a rule says.
 */
@Component({
  selector: 'ww-alert-routing',
  imports: [MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './alert-routing.component.html',
  styleUrl: './alert-routing.component.scss',
})
export class AlertRoutingComponent implements OnInit {
  private readonly alertsApi = inject(AlertsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly teamApi = inject(TeamApiService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly labels = AlertTypeLabels.LABELS;
  protected readonly types = AlertTypeLabels.TYPES;
  protected readonly targetOf = AlertRuleTarget.of;
  protected readonly rules = signal<AlertRule[]>([]);
  protected readonly defaults = signal<AlertRules['default_rules']>([]);
  protected readonly sites = signal<Site[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly members = signal<Member[]>([]);
  protected readonly error = signal('');
  protected readonly saved = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isIncomplete = computed(() => this.rules().some(AlertRuleTarget.isIncomplete));
  protected readonly typesWithoutRules = computed(() =>
    this.types.filter((type) => !this.rules().some((rule) => rule.alert_type === type)),
  );

  async ngOnInit(): Promise<void> {
    try {
      const [routing, sites, roles, members] = await Promise.all([
        firstValueFrom(this.alertsApi.rules()),
        firstValueFrom(this.sitesApi.list()),
        firstValueFrom(this.teamApi.listRoles()),
        firstValueFrom(this.teamApi.listMembers()),
      ]);
      this.rules.set(routing.rules);
      this.defaults.set(routing.default_rules);
      this.sites.set(sites.items);
      this.roles.set(roles);
      this.members.set(members.filter((member) => member.status === 'active'));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected add(type: AlertType = 'charger_offline'): void {
    const rule: AlertRule = {
      alert_type: type,
      site_id: null,
      role_id: null,
      membership_id: null,
      is_email: true,
      is_in_portal: true,
    };
    this.rules.update((rules) => [...rules, rule]);
    this.saved.set(false);
  }

  protected change(index: number, changes: Partial<AlertRule>): void {
    this.rules.update((rules) =>
      rules.map((rule, i) => (i === index ? { ...rule, ...changes } : rule)),
    );
    this.saved.set(false);
  }

  protected changeTarget(index: number, target: string): void {
    this.rules.update((rules) =>
      rules.map((rule, i) => (i === index ? AlertRuleTarget.apply(rule, target) : rule)),
    );
    this.saved.set(false);
  }

  protected remove(index: number): void {
    this.rules.update((rules) => rules.filter((_, i) => i !== index));
    this.saved.set(false);
  }

  protected async save(): Promise<void> {
    this.isSaving.set(true);
    this.error.set('');
    try {
      const routing = await firstValueFrom(this.alertsApi.saveRules(this.rules()));
      this.rules.set(routing.rules);
      this.saved.set(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
