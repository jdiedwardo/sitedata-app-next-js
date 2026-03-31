import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AnalysisRepository } from "@/server/storage/analysis-repository";
import type { AnalyzeWebsiteResponse } from "@/server/types/analysis";

export class JsonAnalysisRepository implements AnalysisRepository {
  private readonly storageDirectoryPath: string;

  constructor(storageDirectoryPath = join(process.cwd(), "data", "analyses")) {
    this.storageDirectoryPath = storageDirectoryPath;
  }

  async saveAnalysisResult(result: AnalyzeWebsiteResponse): Promise<void> {
    await mkdir(this.storageDirectoryPath, { recursive: true });

    const safeTimestamp = result.metadata.completedAtIso.replace(/[:.]/g, "-");
    const filePath = join(this.storageDirectoryPath, `${safeTimestamp}.json`);

    await writeFile(filePath, JSON.stringify(result, null, 2), "utf8");
  }
}
