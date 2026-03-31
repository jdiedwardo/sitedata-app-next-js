import type { AnalyticsModule } from "@/server/modules/analytics-module";

export class AnalyticsModuleRegistry {
  private readonly modulesById = new Map<string, AnalyticsModule>();

  registerModule(module: AnalyticsModule): void {
    if (this.modulesById.has(module.id)) {
      throw new Error(`Analytics module already registered: ${module.id}`);
    }

    this.modulesById.set(module.id, module);
  }

  getModules(): AnalyticsModule[] {
    return Array.from(this.modulesById.values());
  }
}
