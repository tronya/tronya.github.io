import {
  ConfigurationGroup,
  ConfigurationReferance,
  isConfigurationGroup,
  isConfigurationReferance,
  TableParentConfig,
} from './models';

export enum ConfigTypes {
  ConfigGroup = 'ConfigGroup',
  ConfigReferance = 'ConfigReferance',
}

export class ConfigurationFactory<Config, Type> {
  getConfiguration(config: Config, items: Type[]) {
    if (isConfigurationGroup(config)) {
      return new ConfigGroup<Type>(config, items);
    }
    if (isConfigurationReferance(config)) {
      return new ConfigReferance<Type>(config, items);
    }
    return null;
  }
}

export class ConfigGroup<Type> implements TableParentConfig<Type> {
  type: ConfigTypes;
  constructor(public config: ConfigurationGroup, public items: Type[]) {
    this.type = ConfigTypes.ConfigGroup;
  }
}

export class ConfigReferance<Type> implements TableParentConfig<Type> {
  type: ConfigTypes;
  constructor(public config: ConfigurationReferance, public items: Type[]) {
    this.type = ConfigTypes.ConfigReferance;
  }
}
