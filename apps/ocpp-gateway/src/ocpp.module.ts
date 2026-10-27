import { Module } from '@nestjs/common';
import { SessionTransitions, TariffVersionStore } from '@wattwisely/session-engine';
import { CardAccessRepository } from './access/card-access.repository';
import { ActionHandler } from './adapters/action-handler';
import { AdapterRegistry } from './adapters/adapter-registry';
import { BootRecorder } from './adapters/boot-recorder';
import { CommandTranslators } from './adapters/command-translators';
import { HeartbeatHandler } from './adapters/heartbeat.handler';
import { V16Adapter } from './adapters/v16/v16-adapter';
import { V16AuthorizeHandler } from './adapters/v16/v16-authorize.handler';
import { V16BootNotificationHandler } from './adapters/v16/v16-boot-notification.handler';
import { V16CommandTranslator } from './adapters/v16/v16-command.translator';
import { V16_HANDLERS } from './adapters/v16/v16-handlers.token';
import { V16MeterValuesHandler } from './adapters/v16/v16-meter-values.handler';
import { V16StartTransactionHandler } from './adapters/v16/v16-start-transaction.handler';
import { V16StatusNotificationHandler } from './adapters/v16/v16-status-notification.handler';
import { V16StopTransactionHandler } from './adapters/v16/v16-stop-transaction.handler';
import { V201Adapter } from './adapters/v201/v201-adapter';
import { V201AuthorizeHandler } from './adapters/v201/v201-authorize.handler';
import { V201BootNotificationHandler } from './adapters/v201/v201-boot-notification.handler';
import { V201ChargingStateApplier } from './adapters/v201/v201-charging-state.applier';
import { V201CommandTranslator } from './adapters/v201/v201-command.translator';
import { V201_HANDLERS } from './adapters/v201/v201-handlers.token';
import { V201MeterValuesHandler } from './adapters/v201/v201-meter-values.handler';
import { V201StatusNotificationHandler } from './adapters/v201/v201-status-notification.handler';
import { V201TransactionEnder } from './adapters/v201/v201-transaction-ender';
import { V201TransactionEventHandler } from './adapters/v201/v201-transaction-event.handler';
import { V201TransactionStarter } from './adapters/v201/v201-transaction-starter';
import { V201TransactionSteps } from './adapters/v201/v201-transaction-steps';
import { V201TransactionUpdater } from './adapters/v201/v201-transaction-updater';
import { CommandDispatcher } from './commands/command-dispatcher';
import { CommandListener } from './commands/command-listener';
import { CommandSender } from './commands/command-sender';
import { CommandStore } from './commands/command-store';
import { IssuedTagRegistry } from './commands/issued-tag.registry';
import { OfflineCommandQueue } from './commands/offline-command-queue';
import { TagPolicy } from './commands/tag-policy';
import { BootFollowUp } from './connection/boot-follow-up';
import { ChargerAuthCheck } from './connection/checks/charger-auth.check';
import { ChargerExistsCheck } from './connection/checks/charger-exists.check';
import { DuplicateConnectionCheck } from './connection/checks/duplicate-connection.check';
import { RateLimitCheck } from './connection/checks/rate-limit.check';
import { TransportCheck } from './connection/checks/transport.check';
import { VersionCheck } from './connection/checks/version.check';
import { ConnectionEvents } from './connection/connection-events';
import { ConnectionLifecycle } from './connection/connection-lifecycle';
import { ConnectionOpener } from './connection/connection-opener';
import { ConnectionRegistry } from './connection/connection-registry';
import { DisconnectHandler } from './connection/disconnect-handler';
import { HeartbeatWatcher } from './connection/heartbeat-watcher';
import { LeaseKeeper } from './connection/lease-keeper';
import { OcppRoute } from './connection/ocpp-route';
import { RequestChecks } from './connection/request-checks';
import { UpgradeGuard } from './connection/upgrade-guard';
import { ChargerEventPublisher } from './events/charger-event.publisher';
import { MessageLogWriter } from './log/message-log.writer';
import { GatewayMetrics } from './metrics/gateway-metrics';
import { ConnectorSessionEffects } from './sessions/connector-session-effects';
import { SessionOpener } from './sessions/session-opener';
import { SessionRecorder } from './sessions/session-recorder';
import { BootEventsRepository } from './storage/boot-events.repository';
import { ConnectionsRepository } from './storage/connections.repository';
import { GatewayChargersRepository } from './storage/gateway-chargers.repository';
import { GatewayCommandsRepository } from './storage/gateway-commands.repository';
import { GatewayConnectorsRepository } from './storage/gateway-connectors.repository';
import { GatewayRepositories } from './storage/gateway-repositories';
import { MeterValuesRepository } from './storage/meter-values.repository';
import { SessionsRepository } from './storage/sessions.repository';
import { CallProcessor } from './transport/call-processor';
import { FrameLogger } from './transport/frame-logger';
import { MessagePipeline } from './transport/message-pipeline';

const V16_HANDLER_CLASSES = [
  V16BootNotificationHandler,
  HeartbeatHandler,
  V16StatusNotificationHandler,
  V16AuthorizeHandler,
  V16StartTransactionHandler,
  V16StopTransactionHandler,
  V16MeterValuesHandler,
];

const V201_HANDLER_CLASSES = [
  V201BootNotificationHandler,
  HeartbeatHandler,
  V201StatusNotificationHandler,
  V201AuthorizeHandler,
  V201TransactionEventHandler,
  V201MeterValuesHandler,
];

/**
 * Everything between a charger's socket and the database: checks, pipeline, the handlers
 * of both OCPP versions (module 18 added 2.0.1), commands.
 */
@Module({
  providers: [
    // Storage and events
    GatewayChargersRepository,
    GatewayConnectorsRepository,
    ConnectionsRepository,
    BootEventsRepository,
    SessionsRepository,
    MeterValuesRepository,
    GatewayCommandsRepository,
    GatewayRepositories,
    ChargerEventPublisher,
    MessageLogWriter,
    // Sessions (the shared session engine's classes have no dependencies of their own)
    { provide: SessionTransitions, useValue: new SessionTransitions() },
    { provide: TariffVersionStore, useValue: new TariffVersionStore() },
    SessionRecorder,
    SessionOpener,
    ConnectorSessionEffects,
    // Connections
    RateLimitCheck,
    ChargerExistsCheck,
    TransportCheck,
    VersionCheck,
    ChargerAuthCheck,
    DuplicateConnectionCheck,
    RequestChecks,
    UpgradeGuard,
    ConnectionRegistry,
    LeaseKeeper,
    HeartbeatWatcher,
    ConnectionEvents,
    DisconnectHandler,
    BootFollowUp,
    ConnectionLifecycle,
    ConnectionOpener,
    OcppRoute,
    GatewayMetrics,
    // Messages
    FrameLogger,
    CallProcessor,
    MessagePipeline,
    BootRecorder,
    ...V16_HANDLER_CLASSES,
    {
      provide: V16_HANDLERS,
      useFactory: (...handlers: ActionHandler[]) => handlers,
      inject: V16_HANDLER_CLASSES,
    },
    V16Adapter,
    V201TransactionStarter,
    V201TransactionUpdater,
    V201TransactionEnder,
    V201ChargingStateApplier,
    V201TransactionSteps,
    ...V201_HANDLER_CLASSES.filter((handler) => handler !== HeartbeatHandler),
    {
      provide: V201_HANDLERS,
      useFactory: (...handlers: ActionHandler[]) => handlers,
      inject: V201_HANDLER_CLASSES,
    },
    V201Adapter,
    AdapterRegistry,
    V16CommandTranslator,
    V201CommandTranslator,
    CommandTranslators,
    // Who may charge
    CardAccessRepository,
    IssuedTagRegistry,
    TagPolicy,
    CommandStore,
    CommandSender,
    CommandDispatcher,
    OfflineCommandQueue,
    CommandListener,
  ],
  exports: [ConnectionRegistry, OcppRoute, MessageLogWriter],
})
export class OcppModule {}
