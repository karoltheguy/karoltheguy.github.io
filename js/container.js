/**
 * Container class representing a Podman Quadlet container configuration
 * Based on the Rust quadlet::Container struct
 */
export class Container {
  constructor() {
    // Basic container properties
    this.image = '';
    this.containerName = null;
    this.exec = null;
    
    // Capabilities
    this.addCapability = [];
    this.dropCapability = [];
    
    // Devices and mounts
    this.addDevice = [];
    this.mount = [];
    this.volume = [];
    
    // Network configuration
    this.network = [];
    this.networkAlias = [];
    this.publishPort = [];
    this.exposeHostPort = [];
    this.ip = null;
    this.ip6 = null;
    
    // DNS configuration
    this.dns = [];
    this.dnsOption = [];
    this.dnsSearch = [];
    
    // Environment
    this.environment = [];
    this.environmentFile = [];
    this.environmentHost = false;
    
    // Security
    this.noNewPrivileges = false;
    this.securityLabelDisable = false;
    this.securityLabelFileType = null;
    this.securityLabelLevel = null;
    this.securityLabelNested = false;
    this.securityLabelType = null;
    this.seccompProfile = null;
    this.mask = [];
    this.unmask = null;
    
    // User and group
    this.user = null;
    this.group = null;
    this.groupAdd = [];
    this.userNS = null;
    this.uidMap = [];
    this.gidMap = [];
    this.subUidMap = null;
    this.subGidMap = null;
    
    // Runtime options
    this.readOnly = false;
    this.readOnlyTmpfs = true;
    this.runInit = false;
    this.workingDir = null;
    this.hostName = null;
    this.timezone = null;
    this.shmSize = null;
    this.tmpfs = [];
    
    // Health checks
    this.healthCmd = null;
    this.healthInterval = null;
    this.healthOnFailure = null;
    this.healthRetries = null;
    this.healthStartPeriod = null;
    this.healthStartupCmd = null;
    this.healthStartupInterval = null;
    this.healthStartupRetries = null;
    this.healthStartupSuccess = null;
    this.healthStartupTimeout = null;
    this.healthTimeout = null;
    
    // Systemd integration
    this.notify = 'conmon';
    this.stopSignal = null;
    this.stopTimeout = null;
    
    // Pod integration
    this.pod = null;
    
    // Logging
    this.logDriver = null;
    this.logOpt = [];
    
    // Labels and annotations
    this.label = [];
    this.annotation = [];
    
    // Resource limits
    this.pidsLimit = null;
    this.ulimit = [];
    this.sysctl = [];
    
    // Auto update
    this.autoUpdate = null;
    
    // Pull policy
    this.pull = null;
    
    // Secrets
    this.secret = [];
    
    // Rootfs
    this.rootfs = null;
    
    // Entrypoint
    this.entrypoint = null;
    
    // Additional Podman arguments
    this.podmanArgs = null;
  }

  /**
   * Set the container image with validation
   */
  setImage(image) {
    if (!image || typeof image !== 'string' || image.trim() === '') {
      throw new Error('Image must be a non-empty string');
    }
    this.image = image.trim();
    return this;
  }

  /**
   * Set the container name with validation
   */
  setContainerName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Container name must be a non-empty string');
    }
    
    // Validate container name format (similar to Docker/Podman rules)
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    const trimmedName = name.trim();
    
    if (!namePattern.test(trimmedName)) {
      throw new Error('Container name must start with alphanumeric character and contain only alphanumeric characters, underscores, periods, and hyphens');
    }
    
    this.containerName = trimmedName;
    return this;
  }

  /**
   * Set the exec command
   */
  setExec(command) {
    if (command && typeof command !== 'string') {
      throw new Error('Exec command must be a string');
    }
    this.exec = command;
    return this;
  }

  /**
   * Add a published port with validation
   */
  addPublishPort(port) {
    if (!port || typeof port !== 'string' || port.trim() === '') {
      throw new Error('Port must be a non-empty string');
    }
    
    const trimmedPort = port.trim();
    
    // Validate port format (host:container or just container port, optionally with protocol)
    const portPattern = /^(\d+:)?\d+(\/(?:tcp|udp|sctp))?$/;
    if (!portPattern.test(trimmedPort)) {
      throw new Error('Port must be in format "host:container" or "container", optionally with protocol "/tcp", "/udp", or "/sctp"');
    }
    
    // Check port ranges (1-65535)
    // Remove protocol suffix for validation
    const portForValidation = trimmedPort.replace(/\/(?:tcp|udp|sctp)$/, '');
    const ports = portForValidation.split(':');
    for (const p of ports) {
      const portNum = parseInt(p, 10);
      if (portNum < 1 || portNum > 65535) {
        throw new Error(`Port ${portNum} is out of valid range (1-65535)`);
      }
    }
    
    this.publishPort.push(trimmedPort);
    return this;
  }

  /**
   * Add an environment variable with validation
   */
  addEnvironment(env) {
    if (!env || typeof env !== 'string' || env.trim() === '') {
      throw new Error('Environment variable must be a non-empty string');
    }
    
    const trimmedEnv = env.trim();
    
    // Validate environment variable format (KEY=value)
    if (!trimmedEnv.includes('=')) {
      throw new Error('Environment variable must be in format "KEY=value"');
    }
    
    this.environment.push(trimmedEnv);
    return this;
  }

  /**
   * Add a volume mount with validation
   */
  addVolume(volume) {
    if (!volume || typeof volume !== 'string' || volume.trim() === '') {
      throw new Error('Volume must be a non-empty string');
    }
    
    const trimmedVolume = volume.trim();
    
    // Validate volume format (source:destination or just destination)
    if (!trimmedVolume.includes(':') && !trimmedVolume.startsWith('/')) {
      throw new Error('Volume must be in format "source:destination" or an absolute path');
    }
    
    this.volume.push(trimmedVolume);
    return this;
  }

  /**
   * Add a label with validation
   */
  addLabel(label) {
    if (!label || typeof label !== 'string' || label.trim() === '') {
      throw new Error('Label must be a non-empty string');
    }
    
    const trimmedLabel = label.trim();
    
    // Validate label format (key=value)
    if (!trimmedLabel.includes('=')) {
      throw new Error('Label must be in format "key=value"');
    }
    
    this.label.push(trimmedLabel);
    return this;
  }

  /**
   * Set the pod reference
   */
  setPod(pod) {
    this.pod = pod;
    return this;
  }

  /**
   * Generate the default container name from the image
   */
  getDefaultName() {
    if (this.containerName) {
      return this.containerName;
    }
    
    // Extract name from image (similar to Rust image_to_name function)
    const imageParts = this.image.split('/');
    const imageName = imageParts[imageParts.length - 1];
    
    // Remove tag if present
    const nameWithoutTag = imageName.split(':')[0];
    return nameWithoutTag;
  }

  /**
   * Validate the container configuration
   */
  validate() {
    if (!this.image) {
      throw new Error('Image is required');
    }
    
    // Validate ports
    for (const port of this.publishPort) {
      try {
        const ports = port.split(':');
        for (const p of ports) {
          const portNum = parseInt(p, 10);
          if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error(`Invalid port: ${port}`);
          }
        }
      } catch (e) {
        if (e.message.startsWith('Invalid port:')) {
          throw e;
        }
        throw new Error(`Invalid port format: ${port}`);
      }
    }
  }

  /**
   * Create a deep copy of the container
   */
  clone() {
    const cloned = new Container();
    
    // Copy primitive properties
    cloned.image = this.image;
    cloned.containerName = this.containerName;
    cloned.exec = this.exec;
    cloned.ip = this.ip;
    cloned.ip6 = this.ip6;
    cloned.environmentHost = this.environmentHost;
    cloned.noNewPrivileges = this.noNewPrivileges;
    cloned.securityLabelDisable = this.securityLabelDisable;
    cloned.securityLabelFileType = this.securityLabelFileType;
    cloned.securityLabelLevel = this.securityLabelLevel;
    cloned.securityLabelNested = this.securityLabelNested;
    cloned.securityLabelType = this.securityLabelType;
    cloned.seccompProfile = this.seccompProfile;
    cloned.unmask = this.unmask;
    cloned.user = this.user;
    cloned.group = this.group;
    cloned.userNS = this.userNS;
    cloned.subUidMap = this.subUidMap;
    cloned.subGidMap = this.subGidMap;
    cloned.readOnly = this.readOnly;
    cloned.readOnlyTmpfs = this.readOnlyTmpfs;
    cloned.runInit = this.runInit;
    cloned.workingDir = this.workingDir;
    cloned.hostName = this.hostName;
    cloned.timezone = this.timezone;
    cloned.shmSize = this.shmSize;
    cloned.healthCmd = this.healthCmd;
    cloned.healthInterval = this.healthInterval;
    cloned.healthOnFailure = this.healthOnFailure;
    cloned.healthRetries = this.healthRetries;
    cloned.healthStartPeriod = this.healthStartPeriod;
    cloned.healthTimeout = this.healthTimeout;
    cloned.healthStartupCmd = this.healthStartupCmd;
    cloned.healthStartupInterval = this.healthStartupInterval;
    cloned.healthStartupRetries = this.healthStartupRetries;
    cloned.healthStartupSuccess = this.healthStartupSuccess;
    cloned.healthStartupTimeout = this.healthStartupTimeout;
    cloned.notify = this.notify;
    cloned.stopSignal = this.stopSignal;
    cloned.stopTimeout = this.stopTimeout;
    cloned.pod = this.pod;
    cloned.logDriver = this.logDriver;
    cloned.pidsLimit = this.pidsLimit;
    cloned.autoUpdate = this.autoUpdate;
    cloned.pull = this.pull;
    cloned.rootfs = this.rootfs;
    cloned.entrypoint = this.entrypoint;
    cloned.podmanArgs = this.podmanArgs;
    
    // Copy array properties (deep copy)
    cloned.addCapability = [...this.addCapability];
    cloned.dropCapability = [...this.dropCapability];
    cloned.addDevice = [...this.addDevice];
    cloned.mount = [...this.mount];
    cloned.volume = [...this.volume];
    cloned.network = [...this.network];
    cloned.networkAlias = [...this.networkAlias];
    cloned.publishPort = [...this.publishPort];
    cloned.exposeHostPort = [...this.exposeHostPort];
    cloned.dns = [...this.dns];
    cloned.dnsOption = [...this.dnsOption];
    cloned.dnsSearch = [...this.dnsSearch];
    cloned.environment = [...this.environment];
    cloned.environmentFile = [...this.environmentFile];
    cloned.mask = [...this.mask];
    cloned.groupAdd = [...this.groupAdd];
    cloned.uidMap = [...this.uidMap];
    cloned.gidMap = [...this.gidMap];
    cloned.tmpfs = [...this.tmpfs];
    cloned.label = [...this.label];
    cloned.logOpt = [...this.logOpt];
    cloned.annotation = [...this.annotation];
    cloned.ulimit = [...this.ulimit];
    cloned.sysctl = [...this.sysctl];
    cloned.secret = [...this.secret];
    
    return cloned;
  }
}