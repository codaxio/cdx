import { Command } from "commander";

export class BaseCommand {
  name: string = "BaseCommand";
  description: string = "Command";
  options = [
    ['-h, --help', 'Show help'],
  ];

  constructor(public program: Command, public config: Record<string, any>) {}

  async register() {
    const command = this.program.command(this.name).description(this.description);

    this.options.forEach((option) => command.option(option[0], option[1]));

    command.action(async (options, command) => {
     return await this.run(options, command)
    });

    return command;
  }

  async run(options: Record<string, any>, command: any) {
    throw new Error("Method run not implemented.")
  }


  log(...args: any[]) {
    console.log(`${this.name}:`, ...args);
  }
}