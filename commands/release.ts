import { BaseCommand, c, padBetween } from '../src';
import fs from 'fs';

export default class ReleaseCommand extends BaseCommand {
  name = 'release';
  description = 'Create a new release';
  options = [
    ['-f, --from <from>', 'The starting ref to scan for changes', 'latest'],
    ['-t, --to <to>', 'The ending ref to scan for changes', 'HEAD'],
  ];

  defaultConfig = {
    pullRequest: {
      labels: ['autorelease: pending'],
      title: 'chore: release ${version}',
      header: ':robot: I have created a release *beep* *boop*',
      fix: '### Bug Fixes',
      feat: '### Features',
      docs: '### Documentation',
      test: '### Tests',
      chore: '### Chore',
      dependencies: '### Dependencies',
      other: '### Other Changes',
    },
  };

  async run(options: Record<string, any>, command: any) {
    const commandConfig = this.mergeConfig(this.defaultConfig, 'release').release;

    const manifest = await this.readJson('.release-manifest.json');
    if (manifest?.bumps?.length) {
      await this.reset(manifest);
    }
    const logs = await this.getCommits({
      from: options.from,
      to: options.to,
    });
    const commits = await this.parseCommits(logs);
    this.log(`Analyzing ${c.green(commits.length)} commits...`);
    const bumps = await this.checkBumps({
      commits,
      commandConfig,
    });

    if (!bumps.length) {
      this.log('No changes detected, skipping release...');
      return;
    }
    const changelog = this.generateChangelog({ bumps, commandConfig });

    await this.exec('git checkout -B release/release-prod 2>&1');
    this.writeJson('.release-manifest.json', {
      bumps,
      changelog,
    });

    await this.applyBumps(bumps);
    await this.exec('git add .');
    await this.exec('git commit -m "chore: bump versions"');
    this.updateChangelogs(bumps);
    await this.exec('git add .');
    await this.exec('git commit -m "chore: update changelogs"');
    //this.createPR(changelog);

    console.log(bumps, manifest, changelog);
  }

  async createPR(changelog: string) {
    await this.exec(`gh pr create -B main --title "chore: release" --body "${changelog}"`);
  }

  updateChangelogs(bumps: Bump[]) {
    for (const bump of bumps) {
      if (!fs.existsSync(`${bump.root}/CHANGELOG.md`)) {
        fs.writeFileSync(`${bump.root}/CHANGELOG.md`, bump.changelog);
        return;
      }
      const changelog = fs.readFileSync(`${bump.root}/CHANGELOG.md`);
      fs.writeFileSync(`${bump.root}/CHANGELOG.md`, `${bump.changelog}\n${changelog}`);
    }
  }
  // Reset the package.json files to their original version to avoid double bump
  // Manifest is reset in the release phase, not changelog one
  async reset(manifest: Record<string, any>) {
    manifest.bumps.forEach((bump: Bump) => (bump.new = bump.current));
    await this.applyBumps(manifest.bumps);
    manifest.bumps.forEach((bump: Bump) => {
      let changelog = fs.readFileSync(`${bump.root}/CHANGELOG.md`).toString();
      changelog = changelog.replace(bump.changelog + '\n', '');
      fs.writeFileSync(`${bump.root}/CHANGELOG.md`, changelog);
    });
  }

  async applyBumps(bumps: Bump[]) {
    for (const bump of bumps) {
      const json = this.readJson(`${bump.root}/package.json`);
      json.version = bump.new;
      this.writeJson(`${bump.root}/package.json`, json);
    }
  }

  generateChangelog({ bumps, commandConfig }: { bumps: Bump[]; commandConfig: Record<string, any> }) {
    let changelog = `${commandConfig.pullRequest.header}
---
`;
    const [year, month, day] = new Date().toISOString().split('T')[0].split('-');
    for (const bump of bumps) {
      bump.changelog = '';
      bump.changelog += `## [${bump.new}](https://github.com/${commandConfig.repository}/compare/${bump.currentTag}...${bump.newTag}) (${year}-${month}-${day})\n\n`;

      const commits = {
        feat: bump.commits.filter((commit: Commit) => commit.type === 'feat'),
        fix: bump.commits.filter((commit: Commit) => commit.type === 'fix'),
        docs: bump.commits.filter((commit: Commit) => commit.type === 'docs'),
        other: bump.commits.filter((commit: Commit) => !['feat', 'fix', 'docs'].includes(commit.type)),
      };
      Object.keys(commits).forEach((key: string) => {
        if (commits[key as keyof typeof commits].length) {
          bump.changelog += `${commandConfig.pullRequest[key as keyof typeof commandConfig.pullRequest]}\n\n`;
          for (const commit of commits[key as keyof typeof commits]) {
            bump.changelog += `* ${commit.message} ([${commit.hash.slice(0, 7)}](https://github.com/${
              commandConfig.repository
            }/commit/${commit.hash}))\n`;
          }
          bump.changelog += '\n';
        }
      });

      if (Object.keys(bump.depsToBump).length) {
        bump.changelog += `${commandConfig.pullRequest.dependencies}\n\n`;
        bump.changelog += '* The following workspace dependencies were updated\n';
        for (const [dep, range] of Object.entries(bump.depsToBump)) {
          bump.changelog += `    * ${dep} bumped from ${bump.json.dependencies[dep]} to ${range}\n`;
        }
      }

      changelog += `<details><summary>${bump.json.name}: ${bump.new}</summary>\n\n${bump.changelog}</details>\n\n`;
    }
    return changelog;
  }

  async checkBumps({ commits, commandConfig }: { commits: Commit[]; commandConfig: Record<string, any> }) {
    let scanDirectories = commandConfig.scan;
    if (!scanDirectories) {
      this.log('No scan directory configured, you need to add paths to `release.scan` in your config file');
      return [];
    }
    let hasRootPackageJson = false;
    if (scanDirectories == '.' || scanDirectories.find((dir: string) => dir === '.')) {
      hasRootPackageJson = true;
    }
    let files = commits
      .flatMap((commit) => commit.files)
      .filter((file) => scanDirectories.some((dir: string) => file.startsWith(dir) && !file.startsWith('.')));
    this.log(`${files.length} files changed...`);
    let packages = files
      .map((file) => [file.split('/')[0], file.split('/')[1]])
      .map((pkg) => pkg.join('/'))
      .filter((value, index, self) => self.indexOf(value) === index);
    if (hasRootPackageJson) {
      let rootFiles = commits.flatMap((commit) => commit.files)
      .filter((file) => !files.includes(file));
      console.log({rootFiles});
      packages.push('.');
    }

    this.log(`${packages.length} packages has changed...\n`, packages);
    const bumps: Bump[] = packages.map((pkg: string) => {
      const packageCommits = commits.filter((commit) => commit.files.some((file) => file.startsWith(pkg == '.' ? '' : pkg)));
      const isMajor = packageCommits.some((commit) => commit.isBreakingChange);
      const isMinor = packageCommits.some((commit) => commit.type === 'feat');
      const isPatch = packageCommits.some((commit) => commit.type === 'fix');
      const type = isMajor ? 'major' : isMinor ? 'minor' : 'patch';
      const json = this.readJson(`${pkg}/package.json`);

      const newVersion = this.computeNewVersion(json.version, type);

      this.log(
        `${padBetween(
          `bumping ${c.bold(c.magenta(json.name))}`,
          ` from ${c.bold(c.cyan(json.version))} to ${this.formatVersion(newVersion, type)} [${c.green(
            c[type === 'major' ? 'red' : type === 'minor' ? 'green' : 'yellow'](type),
          )}]\n`,
          65,
        )}`,
      );
      return {
        pkg,
        json,
        root: pkg,
        changelog: '',
        type: type,
        major: isMajor,
        minor: isMinor,
        patch: isPatch || (!isMajor && !isMinor),
        current: json.version,
        currentTag: `${json.name}-v${json.version}`,
        new: newVersion,
        newTag: `${json.name}-v${newVersion}`,
        commits: packageCommits,
        depsToBump: {},
      };
    });

    const bumpedPackages = bumps.map((bump) => bump.json.name);

    bumps.forEach((bump) => {
      Object.keys(bump.json.dependencies)
        .filter((dep) => bumpedPackages.includes(dep))
        .filter((dep) => this.checkDependencyBump(bump, dep, bump.json.dependencies[dep], bumps));
      Object.keys(bump.json.devDependencies)
        .filter((dep) => bumpedPackages.includes(dep))
        .filter((dep) => this.checkDependencyBump(bump, dep, bump.json.devDependencies[dep], bumps));
    });

    return bumps;
  }

  checkDependencyBump(pkg: Bump, dep: string, depRange: string, bumps: Bump[]) {
    const depBump = bumps.find((b) => b.json.name === dep);
    if (!depBump) return;
    if (!/^[\^~]/.test(depRange as string)) {
      this.log(`${c.bold(c.magenta(pkg.json.name))}: skipping ${dep} ${depRange}`);
      return;
    }

    if (String(depRange).startsWith('~') && depBump.patch) {
      pkg.depsToBump[dep] = `~${depBump.new}`;
      this.log(
        `${c.bold(c.magenta(pkg.json.name))}: bumping ${c.green(dep)} from ${c.bold(
          c.blue(depRange),
        )} to ~${this.formatVersion(depBump.new, depBump.type)}`,
      );
    }
    if (String(depRange).startsWith('^') && (depBump.minor || depBump.patch)) {
      pkg.depsToBump[dep] = `^${depBump.new}`;
      this.log(
        `${c.bold(c.magenta(pkg.json.name))}: bumping ${c.green(dep)} from ${c.bold(
          c.blue(depRange),
        )} to ^${this.formatVersion(depBump.new, depBump.type)}`,
      );
    }
  }

  formatVersion(version: string, bump: 'major' | 'minor' | 'patch') {
    const [major, minor, patch] = version.split('.').map(Number);
    if (bump === 'major') {
      return c.bold(`${c.red(`${major}`)}.${c.green(`0`)}.${c.yellow(`0`)}`);
    } else if (bump === 'minor') {
      return c.bold(`${major}.${c.green(`${minor}`)}.${c.yellow(`0`)}`);
    } else {
      return c.bold(`${major}.${minor}.${c.yellow(`${patch}`)}`);
    }
  }
  computeNewVersion(version: string, type: 'major' | 'minor' | 'patch') {
    const current = version.split('.').map(Number);
    if (type === 'major') {
      current[0]++;
      current[1] = 0;
      current[2] = 0;
    }
    if (type === 'minor') {
      current[1]++;
      current[2] = 0;
    }
    if (type === 'patch') {
      current[2]++;
    }
    return current.join('.');
  }

  async getCommits(flags: { from: string; to: string }) {
    return await this.exec(`git log --format='%H %ct %s' ${flags.from}..${flags.to}`);
  }

  async getCommitFiles(hash: string) {
    const files = await this.exec(`git diff-tree --no-commit-id --name-only -r ${hash}`);
    return files.split('\n').filter((x) => x);
  }

  async parseCommits(logs: string): Promise<Commit[]> {
    const commits = await Promise.all(
      logs
        .split('\n')
        .filter((x) => x)
        .map(async (line) => {
          const [hash, timestamp, ...rest] = line.split(' ');
          const [type] = rest.join(' ').split(':');
          const scope = type.split('(')[1]?.split(')')[0];
          const isBreakingChange = type.includes('!');
          const message = rest.join(' ').split(':').slice(1).join(' ').trim();

          return {
            hash,
            timestamp: new Date(Number(timestamp) * 1000),
            message: message,
            type: type.replace('!', '').replace(`(${scope})`, ''),
            scope,
            isBreakingChange,
            files: (await this.exec(`git diff-tree --no-commit-id --name-only -r ${hash}`))
              .split('\n')
              .filter((x) => x),
          };
        }),
    );
    return commits;
  }
}

export type Commit = {
  hash: string;
  timestamp: Date;
  message: string;
  type: string;
  scope: string;
  isBreakingChange: boolean;
  files: string[];
};

export type Bump = {
  changelog: string;
  root: string;
  type: 'major' | 'minor' | 'patch';
  major: boolean;
  minor: boolean;
  patch: boolean;
  current: string;
  currentTag: string;
  new: string;
  newTag: string;
  commits: Commit[];
  json: Record<string, any>;
  depsToBump: Record<string, string>;
};
