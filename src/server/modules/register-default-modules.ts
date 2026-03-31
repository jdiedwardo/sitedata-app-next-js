import { ContentAnalyzer } from "@/server/modules/analyzers/content-analyzer";
import { HeadingStructureAnalyzer } from "@/server/modules/analyzers/heading-structure-analyzer";
import { ImageAnalyzer } from "@/server/modules/analyzers/image-analyzer";
import { LinkAnalyzer } from "@/server/modules/analyzers/link-analyzer";
import { PageMetadataAnalyzer } from "@/server/modules/analyzers/page-metadata-analyzer";
import { AnalyticsModuleRegistry } from "@/server/modules/module-registry";

export function createDefaultAnalyticsModuleRegistry(): AnalyticsModuleRegistry {
  const registry = new AnalyticsModuleRegistry();

  registry.registerModule(new PageMetadataAnalyzer());
  registry.registerModule(new HeadingStructureAnalyzer());
  registry.registerModule(new LinkAnalyzer());
  registry.registerModule(new ContentAnalyzer());
  registry.registerModule(new ImageAnalyzer());

  return registry;
}
