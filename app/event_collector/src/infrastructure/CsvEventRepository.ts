import fs from "fs/promises";
import path from "path";
import { IEventRepository } from "../domain/IEventRepository";
import { Event } from "../domain/Event";

export class CsvEventRepository implements IEventRepository {
  constructor(
    private readonly outputDir: string = "./output",
    private readonly blockStart?: number,
    private readonly blockEnd?: number
  ) {}

  async save(events: Event[]): Promise<void> {
    await this.ensureOutputDir();

    const filename = this.generateFilename();
    const filePath = path.join(this.outputDir, filename);

    const csvContent = this.convertToCsv(events);
    await fs.writeFile(filePath, csvContent, "utf8");

    console.log(`CSVファイルを作成しました: ${filePath} (${events.length}件のイベント)`);
  }

  private generateFilename(): string {
    if (this.blockStart !== undefined && this.blockEnd !== undefined) {
      return `events-${this.blockStart}-${this.blockEnd}.csv`;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `events-${timestamp}.csv`;
  }

  private convertToCsv(events: Event[]): string {
    if (events.length === 0) {
      return "name,position,caller,owner";
    }

    const headers = ["position", "caller", "owner"];
    const rows = events.map((event) => {
      const data = event.data;
      return [data.position || "", data.caller || "", data.owner || ""];
    });

    const csvLines = [headers.join(","), ...rows.map((row) => row.join(","))];

    return csvLines.join("\n");
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
}
