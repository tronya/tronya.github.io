export type StrategyStatus =
  | 'UNKNOWN'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING_ACTIVE'
  | 'PENDING_INACTIVE';

export const StrategyStatus = {
  Unknown: 'UNKNOWN' as StrategyStatus,
  Active: 'ACTIVE' as StrategyStatus,
  Inactive: 'INACTIVE' as StrategyStatus,
  PendingActive: 'PENDING_ACTIVE' as StrategyStatus,
  PendingInactive: 'PENDING_INACTIVE' as StrategyStatus,
};

export type OperationMode =
  | 'MANUAL_ACTIVE'
  | 'MANUAL_INACTIVE'
  | 'AUTOMATIC'
  | 'SIMULATION';

export const OperationMode = {
  ManualActive: 'MANUAL_ACTIVE' as OperationMode,
  ManualInactive: 'MANUAL_INACTIVE' as OperationMode,
  Automatic: 'AUTOMATIC' as OperationMode,
  Simulation: 'SIMULATION' as OperationMode,
};


export type ExecutionType =
  | 'AUTOMATIC'
  | 'SEMI_AUTOMATIC_ACTIVATION'
  | 'SEMI_AUTOMATIC_DEACTIVATION'
  | 'MANUAL';

export const ExecutionType = {
  Automatic: 'AUTOMATIC' as ExecutionType,
  SemiAutomaticActivation: 'SEMI_AUTOMATIC_ACTIVATION' as ExecutionType,
  SemiAutomaticDeactivation: 'SEMI_AUTOMATIC_DEACTIVATION' as ExecutionType,
  Manual: 'MANUAL' as ExecutionType,
};

export namespace TriggerGroup {
  export type BooleanOperatorEnum = 'AND' | 'OR';
  export const BooleanOperatorEnum = {
    And: 'AND' as BooleanOperatorEnum,
    Or: 'OR' as BooleanOperatorEnum,
  };
}

export interface StrategyHistoryMap {
  total: number;
  data: { [key: string]: Array<StrategyHistory> };
}

export interface StrategyHistory {
  /**
   * The unique Id of this revision
   */
  revisionId: number;
  /**
   * The date when the revision was created
   */
  timestamp?: string;
  strategy: Strategy;
}

export interface Strategy {
  /**
   * ID to identify the strategy
   */
  guid?: string;
  /**
   * The name of the strategy
   */
  name: string;
  /**
   * The description of the strategy
   */
  description?: string;
  /**
   * The priority of the strategy, to evaluate which commands should be used, if more then one strategy handle a command for the same device
   */
  priority: number;
  /**
   * ID to identify the tenant for that strategy
   */
  tenantId: string;
  /**
   * The timezone id for the strategy
   */
  timezoneId: string;
  /**
   * The time of the last evaluation
   */
  lastExecuted?: string;
  /**
   * The time of the last known activation
   */
  lastActivation?: string;
  /**
   * The time of the creation
   */
  createdOn?: string;
  /**
   * The time of the last modification
   */
  modifiedOn?: string;
  /**
   * The username of the user who created the strategy
   */
  creator?: string;
  /**
   * The username of the user who performed the latest update of the strategy
   */
  lastUpdater?: string;
  /**
   * ID to identify the strategy at the device manager
   */
  deviceManagerId?: string;
  /**
   * Device group guid used to register strategy to device manager
   */
  deviceGroupGuid?: string;
  /**
   * If true, notifications will be send upon state change of the strategy, if they are configured.
   */
  useNotifications?: boolean;
  /**
   * If true, strategies will be referenced to the Command Manager version 2.
   */
  useCommandManagerV2?: boolean;
  /**
   * Guid of the Command Level, needed for executions of strategies with Command Manager version 2.
   */
  commandLevelGuid?: string;
  status: StrategyStatus;
  operationMode: OperationMode;
  executionType: ExecutionType;
  triggerGroup?: any;
  /**
   * Identifies a list of possible outputs
   */
  output: any;
  timeTable?: any;
  timeInterval?: any;
  evaluationTrigger: any;
  authorizationConfiguration: any;
  antiFlutter?: any;
  /**
   * Describes the current state of the communication to other services
   */
  communicationStates?: Array<object>;
}
