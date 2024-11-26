import { Command } from 'commander';
import * as chalk from 'chalk';
import { Writable } from 'stream';

declare class BaseCommand {
    program: Command;
    config: Record<string, any>;
    name: string;
    description: string;
    options: string[][];
    constructor(program: Command, config: Record<string, any>);
    register(): Promise<Command>;
    run(options: Record<string, any>, command: any): Promise<void>;
    exec(command: string, options?: {
        cwd?: string;
        live?: boolean;
    }): Promise<string>;
    readJson(path: string): any;
    writeJson(path: string, data: Record<string, any>): void;
    getConfig(key: string): Record<string, any>;
    mergeConfig(config: Record<string, any>, key: string): Record<string, any>;
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
}): Promise<string>;
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
    level: chalk.ColorSupportLevel;
    rgb: (red: number, green: number, blue: number) => chalk.ChalkInstance;
    hex: (color: string) => chalk.ChalkInstance;
    ansi256: (index: number) => chalk.ChalkInstance;
    bgRgb: (red: number, green: number, blue: number) => chalk.ChalkInstance;
    bgHex: (color: string) => chalk.ChalkInstance;
    bgAnsi256: (index: number) => chalk.ChalkInstance;
    reset: chalk.ChalkInstance;
    bold: chalk.ChalkInstance;
    dim: chalk.ChalkInstance;
    italic: chalk.ChalkInstance;
    underline: chalk.ChalkInstance;
    overline: chalk.ChalkInstance;
    inverse: chalk.ChalkInstance;
    hidden: chalk.ChalkInstance;
    strikethrough: chalk.ChalkInstance;
    visible: chalk.ChalkInstance;
    black: chalk.ChalkInstance;
    red: chalk.ChalkInstance;
    green: chalk.ChalkInstance;
    yellow: chalk.ChalkInstance;
    blue: chalk.ChalkInstance;
    magenta: chalk.ChalkInstance;
    cyan: chalk.ChalkInstance;
    white: chalk.ChalkInstance;
    gray: chalk.ChalkInstance;
    grey: chalk.ChalkInstance;
    blackBright: chalk.ChalkInstance;
    redBright: chalk.ChalkInstance;
    greenBright: chalk.ChalkInstance;
    yellowBright: chalk.ChalkInstance;
    blueBright: chalk.ChalkInstance;
    magentaBright: chalk.ChalkInstance;
    cyanBright: chalk.ChalkInstance;
    whiteBright: chalk.ChalkInstance;
    bgBlack: chalk.ChalkInstance;
    bgRed: chalk.ChalkInstance;
    bgGreen: chalk.ChalkInstance;
    bgYellow: chalk.ChalkInstance;
    bgBlue: chalk.ChalkInstance;
    bgMagenta: chalk.ChalkInstance;
    bgCyan: chalk.ChalkInstance;
    bgWhite: chalk.ChalkInstance;
    bgGray: chalk.ChalkInstance;
    bgGrey: chalk.ChalkInstance;
    bgBlackBright: chalk.ChalkInstance;
    bgRedBright: chalk.ChalkInstance;
    bgGreenBright: chalk.ChalkInstance;
    bgYellowBright: chalk.ChalkInstance;
    bgBlueBright: chalk.ChalkInstance;
    bgMagentaBright: chalk.ChalkInstance;
    bgCyanBright: chalk.ChalkInstance;
    bgWhiteBright: chalk.ChalkInstance;
};

declare function cli(): Promise<void>;

export { BaseCommand, c, cli, createMemoryStream, dd, guessExtension, loadBarrelFile, loadFile, loadFromDir, padBetween, run };
