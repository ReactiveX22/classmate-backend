import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export type PromptModule = {
  id: string;
  content: string;
};

@Injectable()
export class PromptLoaderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PromptLoaderService.name);
  private readonly cache = new Map<string, string>();
  private readonly promptsDir: string;
  private readonly isDev = process.env.NODE_ENV !== 'production';
  private readonly watchers: fsSync.FSWatcher[] = [];

  constructor() {
    this.promptsDir = path.join(process.cwd(), 'src', 'ai', 'prompts');
  }

  async onModuleInit() {
    await this.loadAll();
    if (this.isDev) {
      this.watchForChanges();
    }
  }

  onModuleDestroy() {
    for (const watcher of this.watchers) {
      watcher.close();
    }
  }

  private async loadAll() {
    const modulesDir = path.join(this.promptsDir, 'modules');
    const fragmentsDir = path.join(this.promptsDir, 'fragments');

    await this.loadDirectory(modulesDir);
    await this.loadDirectory(fragmentsDir);

    this.logger.log(
      `Loaded ${this.cache.size} prompt modules: ${Array.from(this.cache.keys()).join(', ')}`,
    );
  }

  private async loadDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir);
      const mdFiles = entries.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const id = file.replace('.md', '');
        this.cache.set(id, content.trim());
      }
    } catch (error) {
      this.logger.error(`Failed to load prompts from ${dir}`, error);
    }
  }

  private async reloadFile(dir: string, filename: string) {
    if (!filename.endsWith('.md')) return;

    try {
      const filePath = path.join(dir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const id = filename.replace('.md', '');
      this.cache.set(id, content.trim());
      this.logger.log(`Hot-reloaded prompt module: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to reload prompt: ${filename}`, error);
    }
  }

  private watchForChanges() {
    const dirs = ['modules', 'fragments'].map((d) =>
      path.join(this.promptsDir, d),
    );

    for (const dir of dirs) {
      try {
        const watcher = fsSync.watch(dir, async (eventType, filename) => {
          if (eventType === 'change' && filename) {
            await this.reloadFile(dir, filename);
          }
        });
        this.watchers.push(watcher);
        this.logger.log(`Watching prompt directory: ${dir}`);
      } catch (error) {
        this.logger.error(`Failed to watch directory: ${dir}`, error);
      }
    }
  }

  get(id: string): string | undefined {
    return this.cache.get(id);
  }

  getRequired(id: string): string {
    const content = this.cache.get(id);
    if (!content) {
      throw new Error(`Prompt module "${id}" not found`);
    }
    return content;
  }

  assemble(parts: string[]): string {
    return parts.map((id) => this.getRequired(id)).join('\n\n---\n\n');
  }

  getTokenEstimate(content: string): number {
    return Math.ceil(content.length / 4);
  }
}
