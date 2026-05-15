const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const homeDir = os.homedir();
const sdkDir = process.env.ANDROID_HOME || path.join(homeDir, 'Android', 'Sdk');
const gradleDir = path.join(homeDir, '.local', 'gradle', 'gradle-8.13', 'bin');
const cordovaBin = path.join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'cordova.cmd' : 'cordova');
const commandArgs = process.argv.slice(2);

if (commandArgs.length === 0) {
    console.error('Informe o comando Cordova. Ex: build android');
    process.exit(1);
}

const extraPaths = [
    gradleDir,
    path.join(sdkDir, 'cmdline-tools', 'latest', 'bin'),
    path.join(sdkDir, 'platform-tools')
].filter((candidatePath) => fs.existsSync(candidatePath));

const env = {
    ...process.env,
    ANDROID_HOME: sdkDir,
    ANDROID_SDK_ROOT: sdkDir,
    PATH: `${extraPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH || ''}`
};

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        env,
        shell: process.platform === 'win32',
        stdio: 'inherit'
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'cordova:sync']);
run(cordovaBin, commandArgs);