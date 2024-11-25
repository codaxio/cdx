import { exec,spawn } from 'child_process';
import defu from 'defu';
import fs from 'fs';
import chalk from 'chalk';
import { Writable } from 'stream';

class MemoryWritable extends Writable {
    _output: string;
    highWaterMark: number;
    live: boolean;
    constructor(options: any) {
      // 1. Stream types: This is a Writable stream
      // 7. Object Mode: We're enabling object mode
      super({ ...options, objectMode: true });
      this.live = options.live || false;
      // 2. Buffering: We're setting a custom highWaterMark
      this.highWaterMark = options.highWaterMark || 2;
      this._output = ''
    }
    _write(chunk: string, encoding: string, callback?: (error: Error | null | undefined) => void) {
      this.live && process.stdout.write(chunk);
      this._output+=chunk.toString();
    }
    _final() {
      return this._output;
    }
  }

export function createMemoryStream(options: { live: boolean }) { 
  return new MemoryWritable(options);
}

export async function run(command: string, options: { 
  cwd?: string,
  live?: boolean
} = {
  live: false,
  cwd: process.cwd(),
}) {
 return new Promise((resolve, reject) => {
  var outputStream = createMemoryStream({ live: options.live === true });
  const child = spawn(command, { shell: true, cwd: options.cwd });

child.stdout.pipe(outputStream);
child.on('close', function(code) {
  if (code === 0) {
    resolve(outputStream._final());
  } else {
    reject(new Error(`Command failed with code ${code}`));
  }
}
);
child.stderr.on('data', function(data) { 
  console.log("Error running command", command, data.toString());
  throw new Error(data.toString());
 });
});
}
export const padBetween = function(left: string, right: string, padding = 30) {
  return left.padEnd(padding, ' ') + right.trim();
}


export const c = {
  blue: chalk.blue,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
}