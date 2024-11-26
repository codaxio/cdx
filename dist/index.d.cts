#!pnpx tsx
import { Command } from 'commander';
export { Command } from 'commander';
import * as chalk from 'chalk';
import { Writable } from 'stream';

declare class BaseCommand {
    program: Command;
    name: string;
    description: string;
    options: string[][];
    constructor(program: Command);
    register(): Promise<Command>;
    run(): void;
    log(...args: any[]): void;
}

declare class MemoryWritable extends Writable {
    _output: string;
    highWaterMark: number;
    live: boolean;
    constructor(options: any);
    _write(chunk: string, encoding: string, callback?: (error: Error | null | undefined) => void): void;
    _final(): string;
}
declare function createMemoryStream(options: {
    live: boolean;
}): MemoryWritable;
declare function run(command: string, options?: {
    cwd?: string;
    live?: boolean;
}): Promise<unknown>;
declare const padBetween: (left: string, right: string, padding?: number) => string;
declare const loadFile: (path: string) => Promise<any>;
declare const loadBarrelFile: (path: string) => Promise<{
    name: string;
    command: unknown;
}[]>;
declare const loadFromDir: (dir: string) => Promise<{
    name: string;
    command: any;
}[]>;
declare const guessExtension: (path: string, allowedExtensions?: string[]) => string;
declare const c: {
    blue: chalk.ChalkInstance;
    green: chalk.ChalkInstance;
    red: chalk.ChalkInstance;
    yellow: chalk.ChalkInstance;
};

declare const utils_c: typeof c;
declare const utils_createMemoryStream: typeof createMemoryStream;
declare const utils_guessExtension: typeof guessExtension;
declare const utils_loadBarrelFile: typeof loadBarrelFile;
declare const utils_loadFile: typeof loadFile;
declare const utils_loadFromDir: typeof loadFromDir;
declare const utils_padBetween: typeof padBetween;
declare const utils_run: typeof run;
declare namespace utils {
  export { utils_c as c, utils_createMemoryStream as createMemoryStream, utils_guessExtension as guessExtension, utils_loadBarrelFile as loadBarrelFile, utils_loadFile as loadFile, utils_loadFromDir as loadFromDir, utils_padBetween as padBetween, utils_run as run };
}

declare function createCLI(): Promise<void>;

export { BaseCommand, createCLI, utils };
