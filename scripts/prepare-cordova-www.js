const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

const filesToCopy = [
    'index.html',
    'ajuda.html',
    'privacidade.html',
    'manifest.json',
    'sw.js'
];

const directoriesToCopy = [
    'assets',
    'css',
    'js'
];

function removeDir(dirPath) {
    fs.rmSync(dirPath, { force: true, recursive: true });
}

function copyFile(relativePath) {
    const source = path.join(rootDir, relativePath);
    const destination = path.join(wwwDir, relativePath);

    if (!fs.existsSync(source)) return;

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
}

function copyDirectory(relativePath) {
    const source = path.join(rootDir, relativePath);
    const destination = path.join(wwwDir, relativePath);

    if (!fs.existsSync(source)) return;

    fs.cpSync(source, destination, { recursive: true });
}

function injectCordovaScripts() {
    const htmlPath = path.join(wwwDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    if (!html.includes('src="cordova.js"')) {
        html = html.replace(
            '<!-- SCRIPTS DO APP -->',
            '<!-- SCRIPTS DO APP -->\n    <script src="cordova.js"></script>\n    <script src="js/cordova-bootstrap.js"></script>'
        );
    }

    fs.writeFileSync(htmlPath, html);
}

removeDir(wwwDir);
fs.mkdirSync(wwwDir, { recursive: true });

filesToCopy.forEach(copyFile);
directoriesToCopy.forEach(copyDirectory);
injectCordovaScripts();

console.log('Cordova www atualizado em ./www');