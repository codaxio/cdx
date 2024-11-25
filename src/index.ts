#!pnpx tsx

import { c, run } from "./utils"
import inquirer from "inquirer"
import { Command } from "commander"
import fs from "fs"
import type { BaseCommand } from "./command"

export {Command} from "commander"
const DEBUG = process.env.DEBUG === "true"

export async function createCLI() {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason)
    process.exit(1)
  })
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception thrown:", error)
    process.exit(1)
  })
  process.on("SIGINT", () => {
    console.log("Received SIGINT. Exiting...")
    process.exit(0)
  })
  process.on("SIGTERM", () => {
    console.log("Received SIGTERM. Exiting...")
    process.exit(0)
  })
  process.argv.splice(2, 1)
  const manager = new CommandManager(process.argv)
  manager.init()
}



class CommandManager {
  scan: string[] = []
  commands: BaseCommand[] = []
  config: any
  workspace: any
  program?: Command
  constructor(public argv: string[]) {}

  async loadFile(path: string) {
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

  guessExtension(path: string) {
    let hasExtension = /\.(json|ts|js|yaml|yml)$/.test(path.toLowerCase())
    if (!hasExtension) {
      let extension = [".ts", ".js", ".json", ".yaml", ".yml"].find((ext) =>
        fs.existsSync(path + ext)
      )
      path += extension || ""
    }
    return path
  }

  async loadCLIConfig(configPath: string) {
    configPath = this.guessExtension(configPath)
    let exists = fs.existsSync(configPath)
    if (!exists) {
      console.error("Config file not found", configPath)
      process.exit(1)
    }

    this.config = await this.loadFile(configPath)
  }

  async loadWorkspace(workspace: string) {
    let workspaceConfig = this.config?.workspaces?.[workspace]
    if (!workspaceConfig) { 
      console.error("Workspace not found", workspace)
      process.exit(1)
    }
    this.workspace = this.config?.workspaces?.[workspace]
    let path = this.guessExtension(`${workspaceConfig.path}/${workspaceConfig.config}`)
    this.workspace.configPath = this.workspace.config
    this.workspace.config = await this.loadFile(path)
    if (this.workspace.commands) this.scan.push(...this.workspace.commands)
  }

  async loadCommands() {
    let commands = []
    for (let path of this.scan) {
      if (typeof path === "string") {
        if (fs.lstatSync(path).isDirectory()) commands.push(...(await this.loadFromDir(path)))
        else commands.push(await this.loadFile(this.guessExtension(path)))
      }
    }

    return commands
  }

  async loadBarrelFile(path: string) {
    let commands = []
    let content = await this.loadFile(path)
    if (content && Object.keys(content).length) {
      for (let [name, command] of Object.entries(content)) {
         commands.push(command)
      }
    } else {
      console.error("No commands found in", path)
    }
    return commands
  }

  async loadFromDir(dir: string): Promise<BaseCommand[]> {

    let commands = []
    let files = fs.readdirSync(dir)
    if (files.includes("index.ts")) commands.push(...(await this.loadBarrelFile(`${dir}/index.ts`))) 
    else if (files.includes("index.js")) commands.push(...(await this.loadBarrelFile(`${dir}/index.js`))) 
    else {
      for (let file of files) {
        let path = `${dir}/${file}`
        let isDir = fs.lstatSync(path).isDirectory()
        if (isDir) commands.push(...(await this.loadFromDir(path)))
        else commands.push(await this.loadFile(path))
      }
    }

    return commands
  }


  start() {
    const program = new Command()
      .command(this.workspace?.name || "cdx")
      .description(this.workspace?.description || this.workspace?.name || "Cozy Developer eXperience.")
      .option("-c, --config <path>", "Path to the configuration file")
      .option("-v, --verbose", "Verbose output")
      .version("0.1.0")
      .action(async (data, command, c, d) => {
        program.help()
      })

      // @ts-ignore
    this.commands.forEach((command) => new command(program).register())
    program.parse(this.argv)
  }

  init() {
    this.program = new Command()

    this.program
      .name("cdx")
      .description(`Cozy Developer eXperience.`)
      .option("-c, --config <path>", "Path to the configuration file")
      .option("-w, --workspace <workspace>", "Select a workspace")
      .option("-v, --verbose", "Verbose output")
      .hook("preSubcommand", (thisCommand, actionCommand) => {
        if (DEBUG) {
          console.log(
            `preSubcommand: ${actionCommand.name()}`
          )
          console.log("arguments: %O", actionCommand.args)
          console.log("options: %o", actionCommand.opts())
          console.log("arguments: %O", thisCommand.args)
          console.log("options: %o", thisCommand.opts())
        }
      })
      .hook("preAction", (thisCommand, actionCommand) => {
        if (DEBUG) {
          console.log(
            `About to call action handler for subcommand: ${actionCommand.name()}`
          )
          console.log("arguments: %O", actionCommand.args)
          console.log("options: %o", actionCommand.opts())
        }
      })
      .version("0.1.0")
      .action(async (data, command, c, d) => {
        this.argv = [this.argv[0], this.argv[1], ...command.args]
        if (!data.config && !process.env.CDX_CONFIG)
          return await this.setupConfig()
        if (data.config || process.env.CDX_CONFIG)
          await this.loadCLIConfig(data.config || process.env.CDX_CONFIG)
        if (data.workspace) await this.loadWorkspace(data.workspace)
        if (this.config.commands) this.scan.push(...this.config.commands)
        this.commands = await this.loadCommands()
        this.start()
      })


    this.program.showHelpAfterError()
    this.program.allowUnknownOption()
    this.program.allowExcessArguments()
    this.program.enablePositionalOptions()
    this.program.parse(this.argv)

  }

  async setupConfig() {
    console.log(
      "You must either provide a --config file or set the CDX_CONFIG environment variable"
    )
    const a = await inquirer.prompt([
      {
        type: "input",
        name: "config",
        message: "Enter the path to the configuration file for CDX",
        default: "$HOME/.cdx.yaml",
      },
    ])
    console.log("Setting up config...")
    // detect current shell
    let shell = String(await run("echo $SHELL"))
    switch (shell.trim().replace("/usr", "")) {
      case "/bin/zsh":
        // add to .zshrc
        let zshConfig = fs.readFileSync(`${process.env.HOME}/.zshrc`).toString()
        if (zshConfig.includes("CDX_CONFIG+")) {
          console.log("CDX_CONFIG already set in ~/.zshrc")
          return
        }
        await run(
          `echo "export CDX_CONFIG=$(realpath ${a.config})" >> ~/.zshrc;`
        )
        console.log("Added CDX_CONFIG to ~/.zshrc")
        console.log(
          `Please restart your shell or run ${c.blue(
            `source ~/.zshrc`
          )} to apply changes`
        )
        break
      case "/bin/bash":
        // add to .bashrc
        let bashConfig = fs
          .readFileSync(`${process.env.HOME}/.bashrc`)
          .toString()
        if (bashConfig.includes("CDX_CONFIG+")) {
          console.log("CDX_CONFIG already set in ~/.bashrc")
          return
        }

        await run(
          `echo "export CDX_CONFIG=$(realpath ${a.config})" >> ~/.bashrc;`
        )
        console.log("Added CDX_CONFIG to ~/.bashrc")
        console.log(
          `Please restart your shell or run ${c.blue(
            `source ~/.bashrc`
          )} to apply changes`
        )
        break
      default:
        console.log("Unknown shell", shell)
        console.log("Please add the following to your shell profile:")
        console.log(`export CDX_CONFIG=$(realpath ${a.config})`)
        break
    }
  }
}

if (process.argv[2] === "--cli") {
  createCLI().catch(console.error)
}
