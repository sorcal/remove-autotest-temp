const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const logger = require('log4js').getLogger();

const TIME_SHIFT = 6 * 60 * 60 * 1000; // 6 hours
const RUN_FREQUENCY = 6 * 60 * 60 * 1000; // 6 hours


function isWindows() {
    return process.platform === 'win32'
}

function getUserHome() {
    return process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
}

function testWindowsResourse(resourse) {
    return /^\d+_\d+$/.test(resourse) || /^scoped_dir.+/.test(resourse) || /^\w+\.json\.gzip$/.test(resourse);
}

function getTempResources(rootDir, dateStarted, testFunc) {
    return fs.readdirSync(rootDir).filter(dir => {
        if (testFunc(dir)) {
            let dirStats = fs.statSync(path.join(rootDir, dir));
            return dirStats && dirStats.ctime && new Date(dirStats.ctime).getTime() < (dateStarted - TIME_SHIFT);
        }
        return false;
    });
}

function cleanTempOnWindows() {
    let dateStarted = Date.now();
    let tempDir = path.join(getUserHome(), 'AppData', 'Local', 'Temp');
    logger.info(`inspecting ${tempDir} directory ...`);
    let resourcesList = getTempResources(tempDir, dateStarted, testWindowsResourse);

    logger.info(`${resourcesList.length} temp resources found`);
    let removedAmount = 0;
    if (resourcesList.length) {
        logger.info(`Removing ...`);
        resourcesList.forEach(dir => {
            let dirFullPath = path.join(tempDir, dir);
            try{
                rimraf.sync(dirFullPath);
                removedAmount++;
                if (removedAmount % 100 === 0) {
                    logger.info(removedAmount);
                }
            } catch(e) {
                logger.error(`Failed to remove ${dirFullPath}`, e)
            }
        });
        logger.info(`Directories and files removed: ${removedAmount}`);
    }
}

if (isWindows()) {
    setInterval(cleanTempOnWindows, RUN_FREQUENCY);
    cleanTempOnWindows();
} else {
    logger.info('Implemented only for windows systems')
}

