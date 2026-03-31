import type { AnalyticsModule } from "@/server/modules/analytics-module";
import { getParsedDocument, resolveCrawledPageSnapshots } from "@/server/modules/crawl-pages";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";

interface ImageAnalyzerResultData {
  totalImages: number;
  imagesWithAltText: number;
  imagesMissingAltText: number;
  altCoveragePercent: number;
}

export class ImageAnalyzer implements AnalyticsModule {
  readonly id = "image-analysis";
  readonly name = "Image Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<ImageAnalyzerResultData>> {
    const snapshots = resolveCrawledPageSnapshots(context);
    let imagesWithAltText = 0;
    let totalImages = 0;

    for (const snapshot of snapshots) {
      const parsedDocument = getParsedDocument(snapshot);
      const images = parsedDocument.dom("img").toArray();
      totalImages += images.length;
      imagesWithAltText += images.filter((image) => {
        const altText = parsedDocument.dom(image).attr("alt")?.trim() ?? "";
        return altText.length > 0;
      }).length;
    }

    const imagesMissingAltText = totalImages - imagesWithAltText;
    const altCoveragePercent = totalImages === 0 ? 100 : Math.round((imagesWithAltText / totalImages) * 100);

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: {
        totalImages,
        imagesWithAltText,
        imagesMissingAltText,
        altCoveragePercent,
      },
    };
  }
}
