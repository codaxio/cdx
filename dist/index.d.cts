#!pnpx tsx
import { Command } from 'commander';
export { Command } from 'commander';
import * as chalk from 'chalk';
import { Writable } from 'stream';

declare class BaseCommand {
    program: Command;
    constructor(program: Command);
    static register(): void;
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
declare const c: {
    blue: chalk.ChalkInstance;
    green: chalk.ChalkInstance;
    red: chalk.ChalkInstance;
    yellow: chalk.ChalkInstance;
};

declare const utils_c: typeof c;
declare const utils_createMemoryStream: typeof createMemoryStream;
declare const utils_padBetween: typeof padBetween;
declare const utils_run: typeof run;
declare namespace utils {
  export { utils_c as c, utils_createMemoryStream as createMemoryStream, utils_padBetween as padBetween, utils_run as run };
}

declare function createCLI(): Promise<void>;

export { BaseCommand, createCLI, utils };
