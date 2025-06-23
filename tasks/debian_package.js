/*
 * debian-packager
 * https://github.com/likesalmon/debian-packager
 *
 * Licensed under the MIT license.
 */

'use strict';

var fileSystem = require('./fileOrDirectory.js');
var replace = require('./replace.js');
var fs = require('fs-extra');
var glob = require('glob');
var options = require('./options');
var messages = require('./messages');
var path = require('path');


var _validateOptions = options._validate,
    _mergeOptions = options._merge,
    _copy = fileSystem._copy,
    _cleanUp = fileSystem._cleanUp,
    _findAndReplace = replace._findAndReplace,
    _transformAndReplace = replace._transformAndReplace;

function preparePackageContents (makefile, files, follow_soft_links, quiet) {
    _transformAndReplace([makefile], '\\$\\{file_list\\}', files, function (file) {
        return [].concat.apply([], 
            file.src.map(function (src) {
                return glob.sync(path.join(file.cwd || '', src));
            })
        ).filter(function (filepath) {
            try {
                var stats = fs.statSync(filepath);
                return stats.isFile();
            } catch (err) {
                console.warn('File \'' + filepath + '\' not found');
                return false;
            }
        }).map(function (filepath) {
            if (!quiet) {
                console.log('Adding \'' + filepath + '\' to \'' + file.dest + '\'');
            }
            return '\tmkdir -p "$(DESTDIR)' + file.dest.substr(0, file.dest.lastIndexOf('/')) + '" && cp -a ' + (follow_soft_links ? "" : "-P ") + '"' + process.cwd() + '/' + filepath + '" "$(DESTDIR)' + file.dest + '"\n';
        }).join('');
    });
}

function create (config) {
    // Merge task-specific and/or target-specific options with these defaults.
    var settings = _mergeOptions(config),
        spawn = require('child_process').spawn,
        dateFormat = require('dateformat'),
        now = dateFormat(new Date(), 'ddd, d mmm yyyy h:MM:ss +0000'),
        temp_directory = settings.working_directory + settings.packaging_directory_name,
        controlDirectory = temp_directory + '/debian',
        changelog = controlDirectory + '/changelog',
        control = controlDirectory + '/control',
        links = controlDirectory + '/links',
        dirs = controlDirectory + '/dirs',
        formatFile = controlDirectory + '/source/format',
        makefile = temp_directory + '/Makefile',
        dependencies = '';

    if (!settings) {
        console.error(messages.providePackageJson, '\n');
        return;
    }

    // Quit if settings are invalid
    if (!_validateOptions(settings, settings.quiet)) {
        console.error(messages.invalidOptions, '\n');
        return;
    }

    _cleanUp(settings, true);
    _copy(__dirname + '/../' + settings.packaging_directory_name, temp_directory);

    if (settings.custom_template) {
        _copy(settings.custom_template, temp_directory);
    }

    // set environment variables if they are not already set
    process.env.DEBFULLNAME = settings.maintainer.name;
    process.env.DEBEMAIL = settings.maintainer.email;

    if (settings.dependencies) {
        dependencies = ', ' + settings.dependencies;
    }

    // generate packaging control files
    _transformAndReplace([links], '\\$\\{softlinks\\}', settings.links || [], function (softlink) {
        return softlink.target + '       ' + softlink.source + '\n';
    });
    _transformAndReplace([dirs], '\\$\\{directories\\}', settings.directories || [], function (directory) {
        return directory + '\n';
    });
    _findAndReplace([changelog, control], '\\$\\{maintainer.name\\}', settings.maintainer.name);
    _findAndReplace([changelog, control], '\\$\\{maintainer.email\\}', settings.maintainer.email);
    _findAndReplace([changelog], '\\$\\{date\\}', now);
    _findAndReplace([changelog, control, links, dirs], '\\$\\{name\\}', settings.package_name);
    _findAndReplace([control], '\\$\\{short_description\\}', settings.short_description);
    _findAndReplace([control], '\\$\\{long_description\\}', settings.long_description);
    _findAndReplace([changelog, control, links, dirs], '\\$\\{version\\}', settings.version);
    _findAndReplace([changelog, control, links, dirs], '\\$\\{build_number\\}', settings.build_number);
    _findAndReplace([control], '\\$\\{dependencies\\}', dependencies);
    _findAndReplace([control], '\\$\\{target_architecture\\}', settings.target_architecture);
    _findAndReplace([control], '\\$\\{category\\}', settings.category);
    _findAndReplace([formatFile], '\\$\\{source_format\\}', settings.source_format);
    preparePackageContents(makefile, settings.files, settings.follow_soft_links, settings.quiet);

    // copy package lifecycle scripts
    var scripts = ['preinst', 'postinst', 'prerm', 'postrm'];
    for (var i = 0; i < scripts.length; i++) {
        if (settings[scripts[i]]) {
            var destination = controlDirectory + '/' + scripts[i];
            console.log(JSON.stringify(settings[scripts[i]]));
            if (settings[scripts[i]].src) {
                fs.copySync(settings[scripts[i]].src, destination);
            } else if (settings[scripts[i]].contents) {
                fs.writeFileSync(destination, settings[scripts[i]].contents);
            }
        }
    }

    // run packaging binaries (i.e. build process)
    console.log(messages.runningDebuild, '\n');

    // Stop here on a dry-run
    if (settings.simulate) {
        return;
    }

    // Bail out if debuild is not installed
    try {
        fs.accessSync('/usr/bin/debuild');
    } catch (e) {
        _cleanUp(settings);
        console.error(messages.debuildNotFound);
        return;
    }


    var checkDeps = settings.disable_debuild_deps_check ? "-d" : "-D";
    var debuild = spawn('debuild', ['--no-tgz-check', '-sa', checkDeps, '-us', '-uc', '--lintian-opts', '--suppress-tags', 'tar-errors-from-data,tar-errors-from-control,dir-or-file-in-var-www'], {
        cwd: temp_directory,
        stdio: [ 'ignore', process.stdout, process.stderr ]
    });
    debuild.on('exit', function (code) {
        if (code !== 0) {
            var logFile = fs.readFileSync(glob.sync(settings.package_location + '*.build')[0], 'utf8');
            console.error(messages.debuildError);
            if (logFile.search("Unmet\\sbuild\\sdependencies\\:\\sdebhelper") !== -1) {
                console.warn(messages.debhelperNotFound);
            }
        } else {
            _cleanUp(settings);
            console.log('Created package: ' + glob.sync(settings.package_location + '*.deb'));
            if (settings.repository) {
                console.log('Running \'dput ' + settings.repository + ' ' + glob.sync(settings.package_location + '*.changes')[0] + '\'');
                require('fs').chmodSync("" + glob.sync(settings.package_location + '*.changes')[0], "744");
                var dputArguments = [settings.repository, glob.sync(settings.package_location + '*.changes')[0]];

                // Activate debug mode
                dputArguments.unshift('-d');

                var dput = spawn('dput', dputArguments, {
                    stdio: [ 'ignore', process.stdout, process.stderr ]
                });
                dput.on('exit', function (code) {
                    if (code !== 0) {
                        console.error(messages.dputError);
                    } else {
                        console.log('Uploaded package: ' + glob.sync(settings.package_location + '*.deb')[0]);
                    }
                });
            }
        }
    });
}

module.exports = {
  create: create
};
