/**
 * 4weird Cloud Compute Fleet Orchestrator
 * Ephemeral node management, remote workload offloading, and transparent usage billing.
 * Allows lower-spec devices (potato laptops, tablets, mobile browsers) to stream and run VibeCodeWorker workloads.
 */

const { EventEmitter } = require('events');

class CloudFleetOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = Object.assign({
      orchestrationFeePercent: 15, // 15% platform premium on top of raw compute
      defaultRegion: 'us-east-1',
      maxActiveInstances: 10
    }, config);

    // Fleet instance catalog (rates in USD per hour)
    this.tierCatalog = {
      'micro': {
        name: '4weird Micro (Eco)',
        vCpu: 1,
        ramGb: 2,
        gpu: 'Headless SwiftShader',
        baseHourlyCost: 0.04,
        targetWorkload: 'Static Websites, UI/UX Auditing, Light Form Automation'
      },
      'standard': {
        name: '4weird Standard (General)',
        vCpu: 4,
        ramGb: 8,
        gpu: 'Hardware Accelerated WebGL',
        baseHourlyCost: 0.16,
        targetWorkload: 'HTML5 2D Games, Concurrent Multi-Tab Crawls, Complex Web Apps'
      },
      'ultra-gpu': {
        name: '4weird Ultra GPU (Extreme)',
        vCpu: 8,
        ramGb: 16,
        gpu: 'NVIDIA RTX Cloud GPU',
        baseHourlyCost: 0.65,
        targetWorkload: 'Heavy 3D WebGL (Three.js/Babylon/Unreal), Godot & Roblox Web Exports'
      }
    };

    this.activeInstances = new Map();
  }

  /**
   * Calculates billed hourly rate including our orchestration fee.
   */
  calculateBilledRate(tierKey) {
    const tier = this.tierCatalog[tierKey];
    if (!tier) throw new Error(`Unknown compute tier: ${tierKey}`);
    const feeMultiplier = 1 + (this.config.orchestrationFeePercent / 100);
    const billedHourly = +(tier.baseHourlyCost * feeMultiplier).toFixed(4);
    const billedPerMinute = +(billedHourly / 60).toFixed(5);
    const billedPerSecond = +(billedHourly / 3600).toFixed(6);
    return {
      baseHourlyCost: tier.baseHourlyCost,
      billedHourly,
      billedPerMinute,
      billedPerSecond,
      orchestrationFeePercent: this.config.orchestrationFeePercent
    };
  }

  /**
   * Provisions an ephemeral remote node.
   */
  async provisionInstance(tierKey = 'standard', options = {}) {
    const tier = this.tierCatalog[tierKey];
    if (!tier) throw new Error(`Unknown compute tier: ${tierKey}`);

    if (this.activeInstances.size >= this.config.maxActiveInstances) {
      throw new Error(`Instance quota reached (${this.config.maxActiveInstances} nodes active)`);
    }

    const instanceId = 'node-' + Math.random().toString(36).substring(2, 9);
    const rateInfo = this.calculateBilledRate(tierKey);

    const instance = {
      id: instanceId,
      tier: tierKey,
      tierDetails: tier,
      rateInfo,
      status: 'provisioning',
      region: options.region || this.config.defaultRegion,
      launchedAt: Date.now(),
      totalActiveSeconds: 0,
      currentCostUSD: 0.0,
      streamUrl: `wss://stream.4weird.games/rtc/${instanceId}`,
      assignedTargetUrl: options.targetUrl || null
    };

    this.activeInstances.set(instanceId, instance);
    this.emit('instance_provisioning', instance);

    // Simulate fast cloud boot (< 50ms in testing/mock, instant in practice)
    await new Promise(r => setTimeout(r, 20));
    instance.status = 'ready';
    this.emit('instance_ready', instance);

    return instance;
  }

  /**
   * Updates billing for active instances by elapsed seconds.
   */
  recordUsageTick(instanceId, secondsElapsed = 1) {
    const inst = this.activeInstances.get(instanceId);
    if (!inst || inst.status !== 'ready') return null;

    inst.totalActiveSeconds += secondsElapsed;
    inst.currentCostUSD = +(inst.totalActiveSeconds * inst.rateInfo.billedPerSecond).toFixed(6);
    return {
      id: instanceId,
      totalActiveSeconds: inst.totalActiveSeconds,
      currentCostUSD: inst.currentCostUSD
    };
  }

  /**
   * Terminates a node and reports final session cost summary.
   */
  async terminateInstance(instanceId) {
    const inst = this.activeInstances.get(instanceId);
    if (!inst) return null;

    inst.status = 'terminated';
    inst.stoppedAt = Date.now();
    this.activeInstances.delete(instanceId);
    this.emit('instance_terminated', inst);

    return {
      id: instanceId,
      tier: inst.tier,
      totalActiveSeconds: inst.totalActiveSeconds,
      totalCostUSD: inst.currentCostUSD,
      rateInfo: inst.rateInfo
    };
  }

  /**
   * Returns catalog list with transparent pricing and specs.
   */
  getCatalog() {
    return Object.keys(this.tierCatalog).map(key => {
      return {
        key,
        ...this.tierCatalog[key],
        pricing: this.calculateBilledRate(key)
      };
    });
  }

  getActiveInstances() {
    return Array.from(this.activeInstances.values());
  }
}

module.exports = {
  CloudFleetOrchestrator
};
