import type { AnalyticsModule } from "@/server/modules/analytics-module";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";
import type { ParsedHtmlDocument } from "@/server/utils/html-parser";

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
    const parsedDocument = context.parsedDocument as ParsedHtmlDocument;
    const images = parsedDocument.dom("img").toArray();
    const imagesWithAltText = images.filter((image) => {
      const altText = parsedDocument.dom(image).attr("alt")?.trim() ?? "";
      return altText.length > 0;
    }).length;

    const totalImages = images.length;
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
