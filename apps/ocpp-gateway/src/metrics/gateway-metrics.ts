import { Injectable } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';
import { ConnectionRegistry } from '../connection/connection-registry';

/**
 * What the gateway counts for the monitoring (module 12): open charger sockets, upgrade
 * attempts and why they were refused, every CALL from a charger and how long its answer
 * took, every command to a charger and how it ended, and message log entries dropped.
 * Action labels are the OCPP 1.6 names this gateway knows; anything else counts as
 * "other", so a misbehaving charger cannot invent new series.
 */
@Injectable()
export class GatewayMetrics {
  static readonly KNOWN_ACTIONS = new Set([
    'Authorize',
    'BootNotification',
    'DataTransfer',
    'DiagnosticsStatusNotification',
    'FirmwareStatusNotification',
    'Heartbeat',
    'MeterValues',
    'StartTransaction',
    'StatusNotification',
    'StopTransaction',
  ]);

  private readonly upgrades;
  private readonly calls;
  private readonly commands;
  private readonly droppedLogEntries;

  constructor(metrics: MetricsRegistry, registry: ConnectionRegistry) {
    metrics.gauge(
      'ocpp_connections',
      'Chargers connected to this gateway',
      [],
      () => registry.size,
    );
    this.upgrades = metrics.counter('ocpp_upgrades_total', 'Connection attempts, by result', [
      'result',
    ]);
    this.calls = {
      count: metrics.counter('ocpp_calls_total', 'CALLs from chargers, by result', [
        'action',
        'result',
      ]),
      duration: metrics.histogram(
        'ocpp_call_duration_seconds',
        'From a CALL arriving to its answer being sent',
        ['action'],
      ),
    };
    this.commands = GatewayMetrics.commandMetrics(metrics);
    this.droppedLogEntries = metrics.counter(
      'ocpp_message_log_dropped_total',
      'Message log entries that could not be written',
    );
  }

  /** "accepted", or the refusal reason such as bad_credentials or too_many_attempts. */
  upgrade(result: string): void {
    this.upgrades.inc({ result });
  }

  /** `result` is "ok" or the CALLERROR code sent back. */
  call(action: string, result: string, seconds: number): void {
    const label = GatewayMetrics.KNOWN_ACTIONS.has(action) ? action : 'other';
    this.calls.count.inc({ action: label, result });
    this.calls.duration.observe({ action: label }, seconds);
  }

  command(action: string, status: string, seconds: number): void {
    this.commands.count.inc({ action, status });
    this.commands.duration.observe({ action }, seconds);
  }

  droppedLog(count: number): void {
    this.droppedLogEntries.inc(count);
  }

  private static commandMetrics(metrics: MetricsRegistry) {
    return {
      count: metrics.counter('ocpp_commands_total', 'Commands sent to chargers, by outcome', [
        'action',
        'status',
      ]),
      duration: metrics.histogram(
        'ocpp_command_duration_seconds',
        "From a command being sent to the charger's reply (or the timeout)",
        ['action'],
      ),
    };
  }
}
