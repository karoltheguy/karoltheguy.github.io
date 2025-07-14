/**
 * PodletJS - JavaScript port of Podlet
 * Generate Podman Quadlet files from Docker run commands and compose files
 */

import { Container } from './container.js';
import { QuadletGenerator } from './quadlet-generator.js';
import { ComposeParser } from './compose-parser.js';
import { 
  Unit, Service, Install, Globals, 
  Volume, PortMapping, Environment, Label,
  ContainerUtils, NotifyOptions, PullPolicy, AutoUpdate, RestartPolicy
} from './types.js';
import { createRequire } from 'module';
import yaml from 'yaml';

const require = createRequire(import.meta.url);
const composerize = require('composerize');

/**
 * Main PodletJS class - entry point for all transformations
 */
export class PodletJS {
  constructor() {
    this.composeParser = new ComposeParser();
    this.quadletGenerator = new QuadletGenerator();
    this.containerUtils = ContainerUtils;
  }

  /**
   * Parse a docker run command and generate a Quadlet file
   * 
   * @param {string|Array} command - Docker run command as string or array of arguments
   * @param {Object} options - Additional options for generation
   * @returns {string} Generated Quadlet file content
   */
  dockerRunToQuadlet(command, options = {}) {
    const composeObject = this.parseDockerRun(command);
    // Get the first service from the compose object and convert to Container
    const serviceName = Object.keys(composeObject.services)[0];
    const serviceConfig = composeObject.services[serviceName];
    const container = this.composeParser._parseService(serviceName, serviceConfig, composeObject);
    return this.containerToQuadlet(container, options);
  }

  /**
   * Parse a compose file and generate Quadlet files
   * 
   * @param {string} yamlContent - Compose file YAML content
   * @param {Object} options - Additional options for generation
   * @returns {Array} Array of objects with filename and content
   */
  composeToQuadlet(yamlContent, options = {}) {
    const servicesObject = this.composeParser.parse(yamlContent);
    const results = [];
    
    for (const [serviceName, container] of Object.entries(servicesObject)) {
      // Handle dependencies through systemd Unit configuration
      let unitConfig = options.unit || {};
      
      if (container._dependsOn && container._dependsOn.length > 0) {
        unitConfig = {
          ...unitConfig,
          after: [...(unitConfig.after || []), ...container._dependsOn.map(dep => `${dep}.service`)],
          wants: [...(unitConfig.wants || []), ...container._dependsOn.map(dep => `${dep}.service`)]
        };
      }

      // Handle restart policy through Service configuration
      let serviceConfig = options.service || {};
      if (container._restart) {
        const restartMap = {
          'no': 'no',
          'always': 'always',
          'on-failure': 'on-failure',
          'unless-stopped': 'always'
        };
        const restart = restartMap[container._restart];
        if (restart !== undefined) {
          serviceConfig = { ...serviceConfig, Restart: restart };
        }
      }

      const content = this.containerToQuadlet(container, {
        ...options,
        name: serviceName,
        unit: Object.keys(unitConfig).length > 0 ? unitConfig : options.unit,
        service: Object.keys(serviceConfig).length > 0 ? serviceConfig : options.service
      });

      results.push({
        filename: `${serviceName}.container`,
        content: content
      });
    }
    
    return results;
  }

  /**
   * Convert a Container object to Quadlet file content
   * 
   * @param {Container} container - Container configuration
   * @param {Object} options - Generation options
   * @returns {string} Generated Quadlet file content
   */
  containerToQuadlet(container, options = {}) {
    // Validate container using container's own validate method
    container.validate();

    // Generate Quadlet file
    return QuadletGenerator.generateFile(container, options);
  }

  /**
   * Parse a docker run command into a Container object
   * 
   * @param {string|Array} command - Docker run command
   * @returns {Container} Parsed container configuration
   */
  parseDockerRun(command) {
    // Convert array to string if needed
    if (Array.isArray(command)) {
      command = command.join(' ');
    }
    
    const composeYaml = composerize(command);
    // Parse the YAML to return the compose object structure
    return yaml.parse(composeYaml);
  }

  /**
   * Parse a compose file into Container objects
   * 
   * @param {string} yamlContent - Compose YAML content
   * @returns {Object} Map of service names to Container objects
   */
  parseCompose(yamlContent) {
    const services = this.composeParser.parse(yamlContent);
    return Object.values(services);
  }

  /**
   * Parse a docker run command and generate a Quadlet file (alias for dockerRunToQuadlet)
   * 
   * @param {string|Array} command - Docker run command as string or array of arguments
   * @param {Object} options - Additional options for generation
   * @returns {string} Generated Quadlet file content
   */
  fromDockerRun(command, options = {}) {
    return this.dockerRunToQuadlet(command, options);
  }

  /**
   * Parse a compose file and generate Quadlet files (alias for composeToQuadlet)
   * 
   * @param {string} filePath - Path to compose file
   * @param {Object} options - Additional options for generation
   * @returns {Object} Map of service names to Quadlet file content
   */
  async fromCompose(filePath, options = {}) {
    const fs = await import('fs-extra');
    const yamlContent = await fs.readFile(filePath, 'utf8');
    return this.composeToQuadlet(yamlContent, options);
  }

}

/**
 * Convenience function to create a new PodletJS instance
 */
export function createPodlet() {
  return new PodletJS();
}

// Export all classes and types for direct use
export {
  Container,
  QuadletGenerator,
  ComposeParser,
  Unit,
  Service, 
  Install,
  Globals,
  Volume,
  PortMapping,
  Environment,
  Label,
  ContainerUtils,
  NotifyOptions,
  PullPolicy,
  AutoUpdate,
  RestartPolicy
};

// Default export
export default PodletJS;