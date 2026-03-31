export class AnalysisInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisInputError";
  }
}

export class AnalysisFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisFetchError";
  }
}
