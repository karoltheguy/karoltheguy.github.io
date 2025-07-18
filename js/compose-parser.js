/**
 * Docker Compose File Parser
 * Parses docker-compose YAML files into Container configurations
 * Based on the Rust implementation from podlet
 */

import yaml from 'js-yaml';
import { Container } from './container.js';

/**
 * Main parser class for docker-compose files
 */
export class ComposeParser {
  constructor() {
    // Initialize supported compose features
    this.supportedFeatures = this._initializeSupportedFeatures();
  }

  /**
   * Parse a compose YAML content into Container objects
   */
  parse(yamlContent) {
    const compose = yaml.load(yamlContent);
    
    if (!compose || typeof compose !== 'object') {
      throw new Error('Invalid compose file format');
    }

    this._validateCompose(compose);
    
    const containers = {};
    
    // Parse services into containers
    if (compose.services) {
      for (const [serviceName, service] of Object.entries(compose.services)) {
        containers[serviceName] = this._parseService(serviceName, service, compose);
      }
    }

    return containers;
  }

  /**
   * Parse a compose file from filesystem
   */
  async parseFile(filePath) {
    const fs = await import('fs-extra');
    const yamlContent = await fs.default.readFile(filePath, 'utf8');
    return this.parse(yamlContent);
  }

  /**
   * Parse a single service into a Container object
   */
  _parseService(serviceName, service, compose) {
    const container = new Container();
    
    // Set image
    if (service.image) {
      container.setImage(service.image);
    } else if (service.build) {
      // For build context, use a build tag
      container.setImage(`${serviceName}.build`);
    } else {
      throw new Error(`Service '${serviceName}' must have either 'image' or 'build'`);
    }

    // Set container name
    if (service.container_name) {
      container.setContainerName(service.container_name);
    } else {
      container.setContainerName(serviceName);
    }

    // Handle command/entrypoint
    if (service.command) {
      const cmd = Array.isArray(service.command) 
        ? service.command.join(' ')
        : service.command;
      container.setExec(cmd);
    }

    if (service.entrypoint) {
      const entrypoint = Array.isArray(service.entrypoint)
        ? service.entrypoint.join(' ')
        : service.entrypoint;
      container.entrypoint = entrypoint;
    }

    // Handle ports
    if (service.ports) {
      this._parsePorts(service.ports, container);
    }

    // Handle volumes
    if (service.volumes) {
      this._parseVolumes(service.volumes, container, compose.volumes);
    }

    // Handle environment
    if (service.environment) {
      this._parseEnvironment(service.environment, container);
    }

    // Handle env_file
    if (service.env_file) {
      const envFiles = Array.isArray(service.env_file) ? service.env_file : [service.env_file];
      envFiles.forEach(file => container.environmentFile.push(file));
    }

    // Handle labels
    if (service.labels) {
      this._parseLabels(service.labels, container);
    }

    // Handle networks
    if (service.networks) {
      this._parseNetworks(service.networks, container);
    }

    // Handle hostname
    if (service.hostname) {
      container.hostName = service.hostname;
    }

    // Handle user
    if (service.user) {
      const userSpec = String(service.user);
      if (userSpec.includes(':')) {
        const [user, group] = userSpec.split(':');
        container.user = user;
        container.group = group;
      } else {
        container.user = userSpec;
      }
    }

    // Handle working directory
    if (service.working_dir) {
      container.workingDir = service.working_dir;
    }

    // Handle restart policy
    if (service.restart) {
      // This will be handled in the Service section
      container._restart = service.restart;
    }

    // Handle security options
    if (service.security_opt) {
      this._parseSecurityOptions(service.security_opt, container);
    }

    // Handle capabilities
    if (service.cap_add) {
      const caps = Array.isArray(service.cap_add) ? service.cap_add : [service.cap_add];
      container.addCapability.push(...caps);
    }

    if (service.cap_drop) {
      const caps = Array.isArray(service.cap_drop) ? service.cap_drop : [service.cap_drop];
      container.dropCapability.push(...caps);
    }

    // Handle devices
    if (service.devices) {
      const devices = Array.isArray(service.devices) ? service.devices : [service.devices];
      container.addDevice.push(...devices);
    }

    // Handle DNS
    if (service.dns) {
      const dns = Array.isArray(service.dns) ? service.dns : [service.dns];
      container.dns.push(...dns);
    }

    // Handle read-only
    if (service.read_only) {
      container.readOnly = true;
    }

    // Handle init
    if (service.init) {
      container.runInit = true;
    }

    // Handle tmpfs
    if (service.tmpfs) {
      const tmpfs = Array.isArray(service.tmpfs) ? service.tmpfs : [service.tmpfs];
      container.tmpfs.push(...tmpfs);
    }

    // Handle privileged
    if (service.privileged) {
      this._addToPodmanArgs(container, '--privileged');
    }

    // Handle tty
    if (service.tty) {
      this._addToPodmanArgs(container, '--tty');
    }

    // Handle stdin_open
    if (service.stdin_open) {
      this._addToPodmanArgs(container, '--interactive');
    }

    // Handle memory limits
    if (service.mem_limit) {
      this._addToPodmanArgs(container, '--memory', service.mem_limit);
    }

    // Handle CPU limits
    if (service.cpus) {
      this._addToPodmanArgs(container, '--cpus', String(service.cpus));
    }

    // Handle healthcheck
    if (service.healthcheck) {
      this._parseHealthcheck(service.healthcheck, container);
    }

    // Handle depends_on (will be converted to systemd dependencies)
    if (service.depends_on) {
      container._dependsOn = Array.isArray(service.depends_on) 
        ? service.depends_on 
        : Object.keys(service.depends_on);
    }

    return container;
  }

  /**
   * Parse ports configuration
   */
  _parsePorts(ports, container) {
    const portList = Array.isArray(ports) ? ports : [ports];
    
    for (const port of portList) {
      if (typeof port === 'string' || typeof port === 'number') {
        container.addPublishPort(String(port));
      } else if (typeof port === 'object') {
        // Long form: { target: 80, published: 8080, protocol: tcp }
        let portSpec = '';
        if (port.published) {
          portSpec += port.published + ':';
        }
        portSpec += port.target;
        if (port.protocol && port.protocol !== 'tcp') {
          portSpec += '/' + port.protocol;
        }
        container.addPublishPort(portSpec);
      }
    }
  }

  /**
   * Parse volumes configuration
   */
  _parseVolumes(volumes, container, composeVolumes = {}) {
    const volumeList = Array.isArray(volumes) ? volumes : [volumes];
    
    for (const volume of volumeList) {
      if (typeof volume === 'string') {
        // Short form: "host:container" or "volume:container"
        container.addVolume(volume);
      } else if (typeof volume === 'object') {
        // Long form: { type: bind, source: ./app, target: /app }
        let volumeSpec = '';
        
        if (volume.type === 'tmpfs') {
          // Handle tmpfs separately
          let tmpfsSpec = volume.target;
          if (volume.tmpfs) {
            if (volume.tmpfs.size) {
              tmpfsSpec += ':size=' + volume.tmpfs.size;
            }
          }
          container.tmpfs.push(tmpfsSpec);
          continue;
        }
        
        if (volume.source) {
          volumeSpec += volume.source + ':';
        }
        volumeSpec += volume.target;
        
        if (volume.read_only) {
          volumeSpec += ':ro';
        }
        
        container.addVolume(volumeSpec);
      }
    }
  }

  /**
   * Parse environment variables
   */
  _parseEnvironment(environment, container) {
    if (Array.isArray(environment)) {
      // Array format: ["NODE_ENV=production", "PORT=3000"]
      environment.forEach(env => container.addEnvironment(env));
    } else if (typeof environment === 'object') {
      // Object format: { NODE_ENV: "production", PORT: 3000 }
      for (const [key, value] of Object.entries(environment)) {
        container.addEnvironment(`${key}=${value}`);
      }
    }
  }

  /**
   * Parse labels
   */
  _parseLabels(labels, container) {
    if (Array.isArray(labels)) {
      // Array format: ["app=web", "version=1.0"]
      labels.forEach(label => container.addLabel(label));
    } else if (typeof labels === 'object') {
      // Object format: { app: "web", version: "1.0" }
      for (const [key, value] of Object.entries(labels)) {
        container.addLabel(`${key}=${value}`);
      }
    }
  }

  /**
   * Parse networks configuration
   */
  _parseNetworks(networks, container) {
    if (Array.isArray(networks)) {
      networks.forEach(network => {
        if (typeof network === 'string') {
          container.network.push(network);
        }
      });
    } else if (typeof networks === 'object') {
      for (const [networkName, config] of Object.entries(networks)) {
        let networkSpec = networkName;
        
        if (config && typeof config === 'object') {
          const options = [];
          if (config.ipv4_address) {
            options.push(`ip=${config.ipv4_address}`);
          }
          if (config.aliases && config.aliases.length > 0) {
            config.aliases.forEach(alias => {
              container.networkAlias.push(alias);
            });
          }
          if (options.length > 0) {
            networkSpec += ':' + options.join(',');
          }
        }
        
        container.network.push(networkSpec);
      }
    }
  }

  /**
   * Parse security options
   */
  _parseSecurityOptions(securityOpts, container) {
    const opts = Array.isArray(securityOpts) ? securityOpts : [securityOpts];
    
    for (const opt of opts) {
      if (opt === 'no-new-privileges:true') {
        container.noNewPrivileges = true;
      } else if (opt.startsWith('label=disable')) {
        container.securityLabelDisable = true;
      } else {
        this._addToPodmanArgs(container, '--security-opt', opt);
      }
    }
  }

  /**
   * Parse healthcheck configuration
   */
  _parseHealthcheck(healthcheck, container) {
    if (healthcheck.disable) {
      container.healthCmd = 'none';
      return;
    }

    if (healthcheck.test) {
      const test = Array.isArray(healthcheck.test) 
        ? healthcheck.test.join(' ')
        : healthcheck.test;
      container.healthCmd = test;
    }

    if (healthcheck.interval) {
      container.healthInterval = healthcheck.interval;
    }

    if (healthcheck.timeout) {
      container.healthTimeout = healthcheck.timeout;
    }

    if (healthcheck.retries) {
      container.healthRetries = healthcheck.retries;
    }

    if (healthcheck.start_period) {
      container.healthStartPeriod = healthcheck.start_period;
    }
  }

  /**
   * Add arguments to podmanArgs field
   */
  _addToPodmanArgs(container, flag, value = null) {
    let args = container.podmanArgs || '';
    if (args) args += ' ';
    
    args += flag;
    if (value !== null) {
      args += ' ' + this._escapeArg(value);
    }
    
    container.podmanArgs = args;
  }

  /**
   * Escape argument for shell safety
   */
  _escapeArg(arg) {
    if (typeof arg !== 'string') {
      arg = String(arg);
    }
    
    if (/[\s"'`$\\|&;()<>]/.test(arg)) {
      return `"${arg.replace(/["\\]/g, '\\$&')}"`;
    }
    return arg;
  }

  /**
   * Validate compose file structure
   */
  _validateCompose(compose) {
    if (!compose.services || Object.keys(compose.services).length === 0) {
      throw new Error('Compose file must contain at least one service');
    }

    // Check for unsupported top-level features
    const unsupported = ['configs', 'secrets'];
    for (const feature of unsupported) {
      if (compose[feature] && Object.keys(compose[feature]).length > 0) {
        throw new Error(`Compose feature '${feature}' is not yet supported`);
      }
    }

    // Validate each service
    for (const [serviceName, service] of Object.entries(compose.services)) {
      this._validateService(serviceName, service);
    }
  }

  /**
   * Validate a single service
   */
  _validateService(serviceName, service) {
    // Check for required fields
    if (!service.image && !service.build) {
      throw new Error(`Service '${serviceName}' must have either 'image' or 'build'`);
    }

    // Check for unsupported features
    const unsupported = [
      'external_links', 'links', 'network_mode', 
      'secrets', 'configs', 'deploy'
    ];
    
    for (const feature of unsupported) {
      if (service[feature]) {
        console.warn(`Warning: Service '${serviceName}' uses unsupported feature '${feature}' - ignoring`);
      }
    }
  }

  /**
   * Initialize supported compose features
   */
  _initializeSupportedFeatures() {
    return {
      services: true,
      volumes: true,
      networks: true,
      version: true,
      name: true,
      // Unsupported
      configs: false,
      secrets: false,
      extensions: false
    };
  }
}