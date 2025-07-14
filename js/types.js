/**
 * Core data structures and enums used throughout the library
 * Based on Rust types from the original Podlet
 */

/**
 * Notify options for systemd integration
 */
export const NotifyOptions = {
  CONMON: 'conmon',
  CONTAINER: 'container', 
  HEALTHY: 'healthy'
};

/**
 * Pull policy options
 */
export const PullPolicy = {
  ALWAYS: 'always',
  MISSING: 'missing',
  NEVER: 'never',
  NEWER: 'newer'
};

/**
 * Auto update options
 */
export const AutoUpdate = {
  REGISTRY: 'registry',
  LOCAL: 'local'
};

/**
 * Restart policy options
 */
export const RestartPolicy = {
  NO: 'no',
  ALWAYS: 'always',
  ON_FAILURE: 'on-failure',
  UNLESS_STOPPED: 'unless-stopped'
};

/**
 * Unit section configuration
 */
export class Unit {
  constructor() {
    this.description = null;
    this.wants = [];
    this.requires = [];
    this.bindTo = [];
    this.after = [];
    this.before = [];
  }
}

/**
 * Service section configuration
 */
export class Service {
  constructor() {
    this.restart = null;
    this.restartSec = null;
    this.timeoutStartSec = null;
    this.timeoutStopSec = null;
  }
}

/**
 * Install section configuration
 */
export class Install {
  constructor() {
    this.wantedBy = [];
    this.requiredBy = [];
  }
}

/**
 * Global Podman arguments
 */
export class Globals {
  constructor() {
    this.podmanArgs = null;
  }
}

/**
 * Volume mount configuration
 */
export class Volume {
  constructor(source, destination, options = []) {
    this.source = source;
    this.destination = destination;
    this.options = options;
  }

  toString() {
    let result = `${this.source}:${this.destination}`;
    if (this.options.length > 0) {
      result += `:${this.options.join(',')}`;
    }
    return result;
  }

  static parse(volumeString) {
    const parts = volumeString.split(':');
    if (parts.length < 2) {
      throw new Error(`Invalid volume format: ${volumeString}`);
    }
    
    const source = parts[0];
    const destination = parts[1];
    const options = parts.length > 2 ? parts[2].split(',') : [];
    
    return new Volume(source, destination, options);
  }
}

/**
 * Port mapping configuration
 */
export class PortMapping {
  constructor(hostPort, containerPort, protocol = 'tcp') {
    this.hostPort = hostPort;
    this.containerPort = containerPort;
    this.protocol = protocol;
  }

  toString() {
    if (this.hostPort === this.containerPort) {
      return this.protocol === 'tcp' ? this.hostPort : `${this.hostPort}/${this.protocol}`;
    }
    return this.protocol === 'tcp' ? 
      `${this.hostPort}:${this.containerPort}` : 
      `${this.hostPort}:${this.containerPort}/${this.protocol}`;
  }

  static parse(portString) {
    // Handle formats like: 8080:80, 8080:80/tcp, 8080/udp, etc.
    let protocol = 'tcp';
    let portPart = portString;
    
    // Extract protocol if present
    if (portString.includes('/')) {
      const parts = portString.split('/');
      portPart = parts[0];
      protocol = parts[1];
    }
    
    if (portPart.includes(':')) {
      const [hostPort, containerPort] = portPart.split(':');
      return new PortMapping(hostPort, containerPort, protocol);
    } else {
      return new PortMapping(portPart, portPart, protocol);
    }
  }
}

/**
 * Environment variable configuration
 */
export class Environment {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  toString() {
    return `${this.key}=${this.value}`;
  }

  static parse(envString) {
    const equalIndex = envString.indexOf('=');
    if (equalIndex === -1) {
      return new Environment(envString, '');
    }
    
    const key = envString.substring(0, equalIndex);
    const value = envString.substring(equalIndex + 1);
    return new Environment(key, value);
  }
}

/**
 * Label configuration
 */
export class Label {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  toString() {
    return `${this.key}=${this.value}`;
  }

  static parse(labelString) {
    const equalIndex = labelString.indexOf('=');
    if (equalIndex === -1) {
      return new Label(labelString, '');
    }
    
    const key = labelString.substring(0, equalIndex);
    const value = labelString.substring(equalIndex + 1);
    return new Label(key, value);
  }
}

/**
 * Mount configuration
 */
export class Mount {
  constructor() {
    this.type = null; // bind, volume, tmpfs, etc.
    this.source = null;
    this.destination = null;
    this.options = [];
  }

  toString() {
    let result = `type=${this.type}`;
    if (this.source) {
      result += `,source=${this.source}`;
    }
    if (this.destination) {
      result += `,destination=${this.destination}`;
    }
    if (this.options.length > 0) {
      result += `,${this.options.join(',')}`;
    }
    return result;
  }
}

/**
 * Device configuration
 */
export class Device {
  constructor(hostDevice, containerDevice = null, permissions = null) {
    this.hostDevice = hostDevice;
    this.containerDevice = containerDevice || hostDevice;
    this.permissions = permissions;
  }

  toString() {
    let result = `${this.hostDevice}:${this.containerDevice}`;
    if (this.permissions) {
      result += `:${this.permissions}`;
    }
    return result;
  }

  static parse(deviceString) {
    const parts = deviceString.split(':');
    const hostDevice = parts[0];
    const containerDevice = parts.length > 1 ? parts[1] : hostDevice;
    const permissions = parts.length > 2 ? parts[2] : null;
    
    return new Device(hostDevice, containerDevice, permissions);
  }
}

/**
 * Utility functions for working with container configurations
 */
export class ContainerUtils {
  /**
   * Extract container name from image name
   */
  static imageToName(image) {
    const imageParts = image.split('/');
    const imageName = imageParts[imageParts.length - 1];
    
    // Remove tag if present
    const nameWithoutTag = imageName.split(':')[0];
    return nameWithoutTag;
  }

  /**
   * Validate container configuration
   */
  static validateContainer(container) {
    const errors = [];
    
    if (!container.image) {
      errors.push('Image is required');
    }
    
    // Validate port mappings
    container.publishPort.forEach((port, index) => {
      try {
        PortMapping.parse(port);
      } catch (error) {
        errors.push(`Invalid port mapping at index ${index}: ${port}`);
      }
    });
    
    // Validate volume mappings
    container.volume.forEach((volume, index) => {
      try {
        if (typeof volume === 'string') {
          Volume.parse(volume);
        }
      } catch (error) {
        errors.push(`Invalid volume mapping at index ${index}: ${volume}`);
      }
    });
    
    return errors;
  }

  /**
   * Normalize container configuration
   */
  static normalizeContainer(container) {
    // Convert string arrays to proper objects where needed
    container.publishPort = container.publishPort.map(port => 
      typeof port === 'string' ? port : port.toString()
    );
    
    container.volume = container.volume.map(volume => 
      typeof volume === 'string' ? volume : volume.toString()
    );
    
    container.environment = container.environment.map(env => 
      typeof env === 'string' ? env : env.toString()
    );
    
    container.label = container.label.map(label => 
      typeof label === 'string' ? label : label.toString()
    );
    
    return container;
  }
}