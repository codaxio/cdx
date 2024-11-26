import { Command } from "commander";
import defu from "defu";
import fs from "fs";
import { run } from "./utils";

export class BaseCommand {
  name: string = "BaseCommand";
  description: string = "Command";
  options = [
    ['-h, --help', 'Show help'],
  ];

  constructor(public program: Command, public config: Record<string, any>) {}

  async register() {
    const command = this.program.command(this.name).description(this.description);

    this.options.forEach((option) => command.option(option[0], option[1], option[2]));

    command.action(async (options, command) => {
     return await this.run(options, command)
    });

    return command;
  }

  async run(options: Record<string, any>, command: any) {
    throw new Error("Method run not implemented.")
  }

  async exec(command: string, options?: {
    cwd?: string;
    live?: boolean;
  }): Promise<string> {
    return await run(command, options);
  }

  readJson(path: string) {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  }

  writeJson(path: string, data: Record<string, any>) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }

  getConfig(key: string) {
    // use dot notation to access nested properties
    return key.split('.').reduce((acc, k) => acc[k], this.config || {});
  }

  mergeConfig(config: Record<string, any>, key: string) {
    const final = defu(this.getConfig(key), config);
    return key.split('.').reduce((acc, k, i, arr) => {
      if (i === arr.length - 1) {
        acc[k] = final;
        return acc;
      }
      acc[k] = acc[k] || {};
      return acc[k];
    }, this.config || {});
  }


  log(...args: any[]) {
    console.log(`${this.name}:`, ...args);
  }
}