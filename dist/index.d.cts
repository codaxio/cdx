import { Command } from 'commander';
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
declare const dd: (...args: any[]) => false | void;
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

declare function cli(): Promise<void>;

export { BaseCommand, c, cli, createMemoryStream, dd, guessExtension, loadBarrelFile, loadFile, loadFromDir, padBetween, run };
