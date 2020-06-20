import * as path from 'path';

import * as semver from 'semver';
import { argv, Arguments } from 'yargs';

import { Context, Parameters } from '../@types/custom';
import { debug, execa } from '../lib/utils';
import { ListrTaskWrapper } from 'listr';
import { getCurrentBranchRemoteInfo } from '../lib/git-helpers';

const validRemoteBranches = ['master', 'servicing'];

const runningInRoot = () => {
    const errorMessage = 'Not running from root of project';
    const pkg = require(path.join(process.cwd(), 'package.json'));

    if (pkg.name !== '@hint/monorepo') {
        throw new Error(errorMessage);
    }
};

const gitAvailable = async () => {
    try {
        await execa('git --version');
    } catch (e) {
        throw new Error('git is not available');
    }
};

const noUncommitedChanges = async () => {
    const { stdout } = await execa('git status --short');

    if (stdout !== '') {
        throw new Error('Repository is not clean');
    }
};

const npmVersion = async () => {
    const { stdout } = await execa('npm -v');
    const minValidVersion = '6.0.0';
    const valid = semver.gte(stdout, minValidVersion);

    debug(`npm version ${stdout} is valid`);

    if (!valid) {
        throw new Error('Unsupported npm version');
    }
};

const authenticatedOnNpm = async () => {
    try {
        const { stdout } = await execa('npm whoami');

        debug(`User logged in as ${stdout}`);
    } catch (e) {
        throw new Error('User is not authenticated on npm');
    }
};

const authenticatedOnVsce = async (ctx: Context) => {
    if (ctx.argv.skipVsce) {
        return;
    }

    let publishers = '';

    try {
        const { stdout } = await execa('vsce ls-publishers');

        publishers = stdout || '';
    } catch (e) {
        throw new Error('Failed to find vsce, run `npm install -g vsce`');
    }

    if (!publishers.split('\n').includes('webhint')) {
        throw new Error('No vsce publish access for webhint, run `yarn run vsce login webhint`');
    }

    debug(`User logged in to vsce with webhint publish access`);
};

const validRemote = async () => {
    const { remoteBranch, remoteURL } = await getCurrentBranchRemoteInfo();

    /*
     * The following regex checks if the remote URL is either:
     *
     *   * git@github.com:webhintio/hint.git
     *   * https://github.com/webhintio/hint.git
     */

    const remoteRegex = new RegExp('^(https://|git@)github.com[:/]webhintio/hint.git$', 'i');

    if (!remoteRegex.test(remoteURL)) {
        const message = `Current branch "${remoteURL}" does not point to the official webhint repository`;

        debug(message);

        throw new Error(message);
    }

    if (!validRemoteBranches.includes(remoteBranch)) {
        const message = `Current branch "${remoteBranch}" does not point to any of the valid branches (${validRemoteBranches.join(', ')})`;

        debug(message);

        throw new Error(message);
    }
};

/**
 * Validates that all the requirements are OK and sets a checkpoint
 * @param ctx The Listr Context
 */
export const validateEnvironment = async (ctx: Context, task: ListrTaskWrapper) => {
    debug(`Validate and configure environment`);

    const checks = [
        runningInRoot,
        gitAvailable,
        noUncommitedChanges,
        npmVersion,
        authenticatedOnNpm,
        authenticatedOnVsce
    ];

    ctx.argv = argv as Arguments<Parameters>;

    // We don't care about the branch when running on `--dryRun` mode
    if (!ctx.argv.dryRun) {
        checks.push(validRemote);
    } else {
        debug('skipping branch check');
    }

    if (!ctx.argv.testMode) {
        for (const check of checks) {
            await check(ctx);
        }
    }

    // Check if we are in the right branch pointing to the right repo?

    // Populate current SHA commit so we can revert back if needed
    const { stdout } = await execa(`git log -n 1 --pretty=format:%H`);

    debug(`Checkpoint SHA: ${stdout}`);
    ctx.sha = stdout;
};
