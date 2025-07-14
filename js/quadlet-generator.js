/**
 * QuadletGenerator - Converts Container objects to Quadlet file format
 * Based on the Rust quadlet serialization logic
 */
export class QuadletGenerator {
  /**
   * Generate a complete Quadlet file from a container configuration
   */
  static generateFile(container, options = {}) {
    const {
      name = container.getDefaultName(),
      unit = null,
      service = null,
      install = null,
      globals = null
    } = options;

    let output = '';

    // Add [Unit] section if provided
    if (unit) {
      output += this.generateUnitSection(unit) + '\n';
    }

    // Add [Container] section
    output += this.generateContainerSection(container);

    // Add global args if provided
    if (globals && globals.podmanArgs) {
      output += `\n[GlobalArgs]\nPodmanArgs=${globals.podmanArgs}\n`;
    }

    // Add [Service] section if provided
    if (service) {
      output += '\n' + this.generateServiceSection(service);
    }

    // Add [Install] section if provided
    if (install) {
      output += '\n' + this.generateInstallSection(install);
    }

    return output;
  }

  /**
   * Generate the [Container] section
   */
  static generateContainerSection(container) {
    let output = '[Container]\n';

    // Required image field
    output += `Image=${container.image}\n`;

    // Container name
    if (container.containerName) {
      output += `ContainerName=${container.containerName}\n`;
    }

    // Exec command
    if (container.exec) {
      output += `Exec=${container.exec}\n`;
    }

    // Published ports
    container.publishPort.forEach(port => {
      output += `PublishPort=${port}\n`;
    });

    // Volumes
    container.volume.forEach(volume => {
      output += `Volume=${volume}\n`;
    });

    // Environment variables
    container.environment.forEach(env => {
      output += `Environment=${this.escapeValue(env)}\n`;
    });

    // Environment files
    container.environmentFile.forEach(file => {
      output += `EnvironmentFile=${file}\n`;
    });

    // Environment host
    if (container.environmentHost) {
      output += 'EnvironmentHost=true\n';
    }

    // Labels
    container.label.forEach(label => {
      output += `Label=${this.escapeValue(label)}\n`;
    });

    // Networks
    container.network.forEach(network => {
      output += `Network=${network}\n`;
    });

    // Network aliases
    container.networkAlias.forEach(alias => {
      output += `NetworkAlias=${alias}\n`;
    });

    // Capabilities
    if (container.addCapability.length > 0) {
      output += `AddCapability=${container.addCapability.join(' ')}\n`;
    }
    if (container.dropCapability.length > 0) {
      output += `DropCapability=${container.dropCapability.join(' ')}\n`;
    }

    // DNS configuration
    if (container.dns.length > 0) {
      if (container.dns.includes('none')) {
        output += 'DNS=none\n';
      } else {
        container.dns.forEach(dns => {
          output += `DNS=${dns}\n`;
        });
      }
    }

    container.dnsOption.forEach(option => {
      output += `DNSOption=${option}\n`;
    });

    container.dnsSearch.forEach(search => {
      output += `DNSSearch=${search}\n`;
    });

    // Security options
    if (container.noNewPrivileges) {
      output += 'NoNewPrivileges=true\n';
    }

    if (container.securityLabelDisable) {
      output += 'SecurityLabelDisable=true\n';
    }

    if (container.securityLabelFileType) {
      output += `SecurityLabelFileType=${container.securityLabelFileType}\n`;
    }

    if (container.securityLabelLevel) {
      output += `SecurityLabelLevel=${container.securityLabelLevel}\n`;
    }

    if (container.securityLabelNested) {
      output += 'SecurityLabelNested=true\n';
    }

    if (container.securityLabelType) {
      output += `SecurityLabelType=${container.securityLabelType}\n`;
    }

    if (container.seccompProfile) {
      output += `SeccompProfile=${container.seccompProfile}\n`;
    }

    // Mask/Unmask
    if (container.mask.length > 0) {
      output += `Mask=${container.mask.join(':')}\n`;
    }

    if (container.unmask) {
      if (Array.isArray(container.unmask)) {
        output += `Unmask=${container.unmask.join(':')}\n`;
      } else {
        output += `Unmask=${container.unmask}\n`;
      }
    }

    // User/Group
    if (container.user) {
      output += `User=${container.user}\n`;
    }

    if (container.group) {
      output += `Group=${container.group}\n`;
    }

    container.groupAdd.forEach(group => {
      output += `GroupAdd=${group}\n`;
    });

    // User namespace
    if (container.userNS) {
      output += `UserNS=${container.userNS}\n`;
    }

    // UID/GID mappings
    container.uidMap.forEach(mapping => {
      output += `UIDMap=${mapping}\n`;
    });

    container.gidMap.forEach(mapping => {
      output += `GIDMap=${mapping}\n`;
    });

    if (container.subUidMap) {
      output += `SubUIDMap=${container.subUidMap}\n`;
    }

    if (container.subGidMap) {
      output += `SubGIDMap=${container.subGidMap}\n`;
    }

    // Runtime options
    if (container.readOnly) {
      output += 'ReadOnly=true\n';
    }

    if (!container.readOnlyTmpfs) {
      output += 'ReadOnlyTmpfs=false\n';
    }

    if (container.runInit) {
      output += 'RunInit=true\n';
    }

    if (container.workingDir) {
      output += `WorkingDir=${container.workingDir}\n`;
    }

    if (container.hostName) {
      output += `HostName=${container.hostName}\n`;
    }

    if (container.timezone) {
      output += `Timezone=${container.timezone}\n`;
    }

    if (container.shmSize) {
      output += `ShmSize=${container.shmSize}\n`;
    }

    // Tmpfs mounts
    container.tmpfs.forEach(tmpfs => {
      output += `Tmpfs=${tmpfs}\n`;
    });

    // Health checks
    if (container.healthCmd) {
      output += `HealthCmd=${container.healthCmd}\n`;
    }

    if (container.healthInterval) {
      output += `HealthInterval=${container.healthInterval}\n`;
    }

    if (container.healthOnFailure) {
      output += `HealthOnFailure=${container.healthOnFailure}\n`;
    }

    if (container.healthRetries) {
      output += `HealthRetries=${container.healthRetries}\n`;
    }

    if (container.healthStartPeriod) {
      output += `HealthStartPeriod=${container.healthStartPeriod}\n`;
    }

    if (container.healthTimeout) {
      output += `HealthTimeout=${container.healthTimeout}\n`;
    }

    // Startup health checks
    if (container.healthStartupCmd) {
      output += `HealthStartupCmd=${container.healthStartupCmd}\n`;
    }

    if (container.healthStartupInterval) {
      output += `HealthStartupInterval=${container.healthStartupInterval}\n`;
    }

    if (container.healthStartupRetries) {
      output += `HealthStartupRetries=${container.healthStartupRetries}\n`;
    }

    if (container.healthStartupSuccess) {
      output += `HealthStartupSuccess=${container.healthStartupSuccess}\n`;
    }

    if (container.healthStartupTimeout) {
      output += `HealthStartupTimeout=${container.healthStartupTimeout}\n`;
    }

    // Systemd integration
    if (container.notify && container.notify !== 'conmon') {
      if (container.notify === 'container') {
        output += 'Notify=true\n';
      } else if (container.notify === 'healthy') {
        output += 'Notify=healthy\n';
      }
    }

    if (container.stopSignal) {
      output += `StopSignal=${container.stopSignal}\n`;
    }

    if (container.stopTimeout) {
      output += `StopTimeout=${container.stopTimeout}\n`;
    }

    // Pod
    if (container.pod) {
      output += `Pod=${container.pod}\n`;
    }

    // Logging
    if (container.logDriver) {
      output += `LogDriver=${container.logDriver}\n`;
    }

    container.logOpt.forEach(opt => {
      output += `LogOpt=${opt}\n`;
    });

    // Annotations
    container.annotation.forEach(annotation => {
      output += `Annotation=${this.escapeValue(annotation)}\n`;
    });

    // Resource limits
    if (container.pidsLimit) {
      output += `PidsLimit=${container.pidsLimit}\n`;
    }

    container.ulimit.forEach(limit => {
      output += `Ulimit=${limit}\n`;
    });

    container.sysctl.forEach(sysctl => {
      output += `Sysctl=${sysctl}\n`;
    });

    // Auto update
    if (container.autoUpdate) {
      output += `AutoUpdate=${container.autoUpdate}\n`;
    }

    // Pull policy
    if (container.pull) {
      output += `Pull=${container.pull}\n`;
    }

    // Secrets
    container.secret.forEach(secret => {
      output += `Secret=${secret}\n`;
    });

    // Rootfs
    if (container.rootfs) {
      output += `Rootfs=${container.rootfs}\n`;
    }

    // Entrypoint
    if (container.entrypoint) {
      output += `Entrypoint=${container.entrypoint}\n`;
    }

    // IP addresses
    if (container.ip) {
      output += `IP=${container.ip}\n`;
    }

    if (container.ip6) {
      output += `IP6=${container.ip6}\n`;
    }

    // Additional Podman arguments
    if (container.podmanArgs) {
      output += `PodmanArgs=${container.podmanArgs}\n`;
    }

    return output;
  }

  /**
   * Generate [Unit] section
   */
  static generateUnitSection(unit) {
    let output = '[Unit]\n';
    
    if (unit.description || unit.Description) {
      output += `Description=${unit.description || unit.Description}\n`;
    }
    
    if (unit.wants && unit.wants.length > 0) {
      output += `Wants=${unit.wants.join(' ')}\n`;
    }
    
    if (unit.requires && unit.requires.length > 0) {
      output += `Requires=${unit.requires.join(' ')}\n`;
    }
    
    if (unit.after && unit.after.length > 0) {
      output += `After=${unit.after.join(' ')}\n`;
    }
    
    if (unit.before && unit.before.length > 0) {
      output += `Before=${unit.before.join(' ')}\n`;
    }
    
    return output;
  }

  /**
   * Generate [Service] section
   */
  static generateServiceSection(service) {
    let output = '[Service]\n';
    
    if (service.restart || service.Restart) {
      output += `Restart=${service.restart || service.Restart}\n`;
    }
    
    if (service.restartSec || service.RestartSec) {
      output += `RestartSec=${service.restartSec || service.RestartSec}\n`;
    }
    
    if (service.timeoutStartSec || service.TimeoutStartSec) {
      output += `TimeoutStartSec=${service.timeoutStartSec || service.TimeoutStartSec}\n`;
    }
    
    return output;
  }

  /**
   * Generate [Install] section
   */
  static generateInstallSection(install) {
    let output = '[Install]\n';
    
    if (install.wantedBy && install.wantedBy.length > 0) {
      output += `WantedBy=${install.wantedBy.join(' ')}\n`;
    }
    
    if (install.requiredBy && install.requiredBy.length > 0) {
      output += `RequiredBy=${install.requiredBy.join(' ')}\n`;
    }
    
    return output;
  }

  /**
   * Escape values that might contain spaces or special characters
   */
  static escapeValue(value) {
    // Proper escaping - escape backslashes first, then quotes
    if (typeof value === 'string' && value.includes(' ')) {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return value;
  }
}