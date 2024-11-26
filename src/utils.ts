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

const IS_DEBUG = process.env.DEBUG === "true";
export const dd = (...args: any[]) => IS_DEBUG && console.log(...args);
export function createMemoryStream(options: { live: boolean }) { 
  return new MemoryWritable(options);
}

export async function run(command: string, options: { 
  cwd?: string,
  live?: boolean
} = {
  live: false,
  cwd: process.cwd(),
}): Promise<string> {
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


export const loadFile = async(path: string)=> {
  let content

  switch (path.split(".").pop()) {
    case "yml":
    case "yaml":
      let yaml = await run(`yq ${path} -o json`)
      content = JSON.parse(String(yaml))
      break
    case "json":
      let json = JSON.parse(fs.readFileSync(path).toString())
      content = json
      break
    case "ts":
    case "js":
      if (!path.startsWith("/")) path = `${process.cwd()}/${path}`
      const _module = await import(`${path}`)
      content = _module.default
      break
  }

  return content
}
export const loadBarrelFile = async(path: string)=> {
  let commands = []
  let content = await loadFile(path)
  if (content && Object.keys(content).length) {
    for (let [name, command] of Object.entries(content)) {
       commands.push({ name, command })
    }
  } else {
    console.error("No commands found in", path)
  }
  return commands
}

export const loadFromDir = async (dir: string): Promise<{ name: string, command: any }[]>=> {

  let commands = [] as { name: string, command: any }[]
  let files = fs.readdirSync(dir)
  if (files.includes("index.ts")) commands.push(...(await loadBarrelFile(`${dir}/index.ts`))) 
  else if (files.includes("index.js")) commands.push(...(await loadBarrelFile(`${dir}/index.js`))) 
  else {
    for (let file of files) {
      let path = `${dir}/${file}`
      let isDir = fs.lstatSync(path).isDirectory()
      if (isDir) commands.push(...(await loadFromDir(path)))
      else commands.push({ name: String(file.split(".").shift()
        || `command-${commands.length}`
      ), command: await loadFile(path) })
    }
  }

  return commands
}

export const guessExtension = (path: string, allowedExtensions: string[] = [".ts", ".js", ".json", ".yaml", ".yml"]) => {
  if (fs.existsSync(path)) return path
  let hasExtension = /\.(json|ts|js|yaml|yml)$/.test(path.toLowerCase())
  if (!hasExtension) {
    let extension = allowedExtensions.find((ext) => fs.existsSync(path + ext))
    path += extension || ""
  }
  return path
}
export const c = {
 blue: chalk.blue,
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  white: chalk.white,
  gray: chalk.gray,
  bold: chalk.bold,
  underline: chalk.underline,
  italic: chalk.italic,
  dim: chalk.dim,
  bgBlue: chalk.bgBlue,
  bgRed: chalk.bgRed,
  bgGreen: chalk.bgGreen,
  bgYellow: chalk.bgYellow,
  bgCyan: chalk.bgCyan,
  bgMagenta: chalk.bgMagenta,
  bgWhite: chalk.bgWhite,
  bgGray: chalk.bgGray,
  bgBlack: chalk.bgBlack,
  bgRgb: chalk.bgRgb,
  rgb: chalk.rgb,
  hex: chalk.hex,
  bgHex: chalk.bgHex,
}