import { Command } from "commander";

export class BaseCommand {
  constructor(public program: Command) {}
  static register() {
    throw new Error("Method register not implemented.")
  }
}