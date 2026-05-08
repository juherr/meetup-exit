import { createWriteStream } from "node:fs";
import type { WriteStream } from "node:fs";
import type { ArchiveRecord } from "./types.ts";

export class JsonlWriter {
  private stream: WriteStream | null = null;
  private opening: Promise<void> | null = null;

  constructor(private readonly filePath: string) {}

  private ensureOpen(): Promise<void> {
    if (this.stream !== null) return Promise.resolve();
    if (!this.opening) {
      this.opening = new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(this.filePath, { flags: "a" });
        const onError = (err: Error) => reject(err);
        ws.once("open", () => {
          ws.off("error", onError);
          this.stream = ws;
          resolve();
        });
        ws.once("error", onError);
      });
    }
    return this.opening;
  }

  async write(record: ArchiveRecord): Promise<void> {
    await this.ensureOpen();
    const line = JSON.stringify(record) + "\n";
    await new Promise<void>((resolve, reject) => {
      this.stream!.write(line, (err) => (err ? reject(err) : resolve()));
    });
  }

  async close(): Promise<void> {
    if (this.opening) await this.opening;
    if (!this.stream) return;
    await new Promise<void>((resolve, reject) => {
      this.stream!.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
