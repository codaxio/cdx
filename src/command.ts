import { Command } from "commander";

export class BaseCommand {
  name: string = "BaseCommand";
  description: string = "Command";
  options = [
    ['-h, --help', 'Show help'],
  ];

  constructor(public program: Command) {}

  async register() {
    const command = this.program.command(this.name).description(this.description);

    this.options.forEach((option) => command.option(option[0], option[1]));

    command.action(this.run.bind(this));

    return command;
  }

  run() {
    throw new Error("Method run not implemented.")
  }


  log(...args: any[]) {
    console.log(`${this.name}:`, ...args);
  }
}