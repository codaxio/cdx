// src/command.ts
import "commander";

// node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c2) => _defu(p, c2, "", merger), {})
  );
}
var defu = createDefu();
var defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});
var defuArrayFn = createDefu((object, key, currentValue) => {
  if (Array.isArray(object[key]) && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

// src/command.ts
import fs2 from "fs";

// src/utils.ts
import { spawn } from "child_process";
import fs from "fs";
import chalk from "chalk";
import { Writable } from "stream";
var MemoryWritable = class extends Writable {
  _output;
  highWaterMark;
  live;
  constructor(options) {
    super({ ...options, objectMode: true });
    this.live = options.live || false;
    this.highWaterMark = options.highWaterMark || 2;
    this._output = "";
  }
  _write(chunk, encoding, callback) {
    this.live && process.stdout.write(chunk);
    this._output += chunk.toString();
  }
  _final() {
    return this._output;
  }
};
var IS_DEBUG = process.env.DEBUG === "true";
var dd = (...args) => IS_DEBUG && console.log(...args);
function createMemoryStream(options) {
  return new MemoryWritable(options);
}
async function run(command, options = {
  live: false,
  cwd: process.cwd()
}) {
  return new Promise((resolve, reject) => {
    var outputStream = createMemoryStream({ live: options.live === true });
    const child = spawn(command, { shell: true, cwd: options.cwd });
    child.stdout.pipe(outputStream);
    child.on(
      "close",
      function(code) {
        if (code === 0) {
          resolve(outputStream._final());
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      }
    );
    child.stderr.on("data", function(data) {
      console.log("Error running command", command, data.toString());
      throw new Error(data.toString());
    });
  });
}
var padBetween = function(left, right, padding = 30) {
  return left.padEnd(padding, " ") + right.trim();
};
var loadFile = async (path) => {
  let content;
  switch (path.split(".").pop()) {
    case "yml":
    case "yaml":
      let yaml = await run(`yq ${path} -o json`);
      content = JSON.parse(String(yaml));
      break;
    case "json":
      let json = JSON.parse(fs.readFileSync(path).toString());
      content = json;
      break;
    case "ts":
    case "js":
      if (!path.startsWith("/")) path = `${process.cwd()}/${path}`;
      const _module = await import(`${path}`);
      content = _module.default;
      break;
  }
  return content;
};
var loadBarrelFile = async (path) => {
  let commands = [];
  let content = await loadFile(path);
  if (content && Object.keys(content).length) {
    for (let [name, command] of Object.entries(content)) {
      commands.push({ name, command });
    }
  } else {
    console.error("No commands found in", path);
  }
  return commands;
};
var loadFromDir = async (dir) => {
  let commands = [];
  let files = fs.readdirSync(dir);
  if (files.includes("index.ts")) commands.push(...await loadBarrelFile(`${dir}/index.ts`));
  else if (files.includes("index.js")) commands.push(...await loadBarrelFile(`${dir}/index.js`));
  else {
    for (let file of files) {
      let path = `${dir}/${file}`;
      let isDir = fs.lstatSync(path).isDirectory();
      if (isDir) commands.push(...await loadFromDir(path));
      else commands.push({ name: String(
        file.split(".").shift() || `command-${commands.length}`
      ), command: await loadFile(path) });
    }
  }
  return commands;
};
var guessExtension = (path, allowedExtensions = [".ts", ".js", ".json", ".yaml", ".yml"]) => {
  if (fs.existsSync(path)) return path;
  let hasExtension = /\.(json|ts|js|yaml|yml)$/.test(path.toLowerCase());
  if (!hasExtension) {
    let extension = allowedExtensions.find((ext) => fs.existsSync(path + ext));
    path += extension || "";
  }
  return path;
};
var c = {
  ...chalk
};

// src/command.ts
var BaseCommand = class {
  constructor(program, config) {
    this.program = program;
    this.config = config;
  }
  name = "BaseCommand";
  description = "Command";
  options = [
    ["-h, --help", "Show help"]
  ];
  async register() {
    const command = this.program.command(this.name).description(this.description);
    this.options.forEach((option) => command.option(option[0], option[1], option[2]));
    command.action(async (options, command2) => {
      return await this.run(options, command2);
    });
    return command;
  }
  async run(options, command) {
    throw new Error("Method run not implemented.");
  }
  async exec(command, options) {
    return await run(command, options);
  }
  readJson(path) {
    return JSON.parse(fs2.readFileSync(path, "utf-8"));
  }
  writeJson(path, data) {
    fs2.writeFileSync(path, JSON.stringify(data, null, 2));
  }
  getConfig(key) {
    return key.split(".").reduce((acc, k) => acc[k], this.config || {});
  }
  mergeConfig(config, key) {
    const final = defu(this.getConfig(key), config);
    return key.split(".").reduce((acc, k, i, arr) => {
      if (i === arr.length - 1) {
        acc[k] = final;
        return acc;
      }
      acc[k] = acc[k] || {};
      return acc[k];
    }, this.config || {});
  }
  log(...args) {
    console.log(`${this.name}:`, ...args);
  }
};

// src/cli.ts
import { Command as Command2 } from "commander";
import fs3 from "fs";

// package.json
var package_default = {
  name: "@codaxio/cdx",
  type: "module",
  version: "0.20.14",
  module: "src/index.ts",
  bin: {
    cdx: "start.sh"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/codaxio/cdx.git"
  },
  description: "Best CLI ever, period.",
  main: "dist/index.js",
  types: "dist/index.d.ts",
  files: [
    "dist",
    "src"
  ],
  scripts: {
    "build:publish": "pnpm i && pnpm build && pnpm version patch && pnpm publish",
    start: "pnpm tsx --watch src/index.ts",
    build: "tsup src/index.ts --dts --format cjs,esm --out-dir dist --clean",
    test: "vitest run",
    "test:watch": "vitest",
    lint: "eslint .",
    "lint:fix": "eslint . --fix"
  },
  keywords: [],
  author: "Codaxio",
  license: "UNLICENSED",
  namespace: "@codaxio",
  dependencies: {
    "@types/node": "^20.0.0",
    chalk: "^5.3.0",
    commander: "^12.1.0",
    defu: "^6.1.4",
    inquirer: "^12.1.0"
  },
  devDependencies: {
    tsup: "^8.3.5",
    typescript: "^5.7.2"
  }
};

// src/cli.ts
async function cli() {
  const program = new Command2().version(package_default.version).description("CDX CLI").option("-w, --cwd <path>", "Teleport to this directory").option("-c, --config <config>", "Config file").option("-l, --load <path...>", "Load commands from theses dirs or files").action(async (options, command) => {
    dd("CDX CLI", options);
    let configFile = options.config || process.env.CDX_CONFIG || "cdx.config.ts";
    let config = await loadFile(guessExtension(configFile));
    dd(`Loading config from ${configFile}`, config);
    let commandsPath = options.load?.length ? options.load : process.env.CDX_SCAN?.split(":") || ["./commands"];
    if (options.cwd) {
      process.chdir(options.cwd);
    }
    commandsPath = [...new Set(commandsPath)];
    commandsPath = await Promise.all(
      await commandsPath.map((path) => {
        if (path.startsWith("/")) return path;
        return `${process.cwd()}/${path}`;
      }).filter((commandPath) => {
        let exists = fs3.existsSync(guessExtension(commandPath));
        if (!exists) {
          console.error(c.red(`Cannot load commands from ${commandPath}. File or directory does not exist.`));
        }
        return exists;
      }).map(async (commandPath) => {
        dd(`Loading commands from ${guessExtension(commandPath)}`);
        const isDir = fs3.lstatSync(guessExtension(commandPath)).isDirectory();
        if (isDir) {
          let commands2 = await loadFromDir(commandPath);
          dd(`Found ${commands2.length} commands in ${commandPath}`, commands2);
          return commands2;
        } else {
          let guessedPath = guessExtension(commandPath);
          dd(`Guessing ${guessedPath}`);
          let command2 = await loadFile(guessedPath);
          dd(`Found ${command2.length} command in ${commandPath}`, command2);
          return { command: command2, name: String(commandPath.split(".").shift()?.split("/").pop()) };
        }
      })
    );
    if (!commandsPath.length) {
      command.help();
      return;
    }
    let commands = commandsPath.flat();
    dd(`Found commands `, commands);
    const program2 = new Command2().command("cdx").description("Cozy Developer eXperience.").action(async (data, command2, c2, d) => program2.help());
    const argv = [process.argv[0], process.argv[1], ...command.args];
    let registration = await Promise.all(commands.map(async (cmd) => {
      dd("Registering command", cmd);
      let Command3 = cmd.command;
      let instance = new Command3(program2, config);
      await instance.register();
    }));
    program2.parse(argv);
  });
  program.parse(process.argv);
}
export {
  BaseCommand,
  c,
  cli,
  createMemoryStream,
  dd,
  guessExtension,
  loadBarrelFile,
  loadFile,
  loadFromDir,
  padBetween,
  run
};
//# sourceMappingURL=index.js.map