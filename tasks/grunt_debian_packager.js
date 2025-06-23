"use strict";

module.exports = function(grunt) {
    var packager = require('./debian_package');
    grunt.registerMultiTask('debian_package', 'Create Debian package', function () {
        var done = this.async();
        var options = this.options({});
        var config = grunt.file.readJSON('package.json');
        var files = this.files.map(function (f) {
            var obj = { dest: f.dest };
            if (Array.isArray(f.src) && f.src.length) {
                obj.src = f.src.slice();
            } else if (f.orig && f.orig.src) {
                obj.src = Array.isArray(f.orig.src) ? f.orig.src.slice() : [f.orig.src];
                if (f.cwd) {
                    obj.cwd = f.cwd;
                } else if (f.orig && f.orig.cwd) {
                    obj.cwd = f.orig.cwd;
                }
            } else if (f.cwd) {
                obj.cwd = f.cwd;
            }
            return obj;
        });
        options.files = files.length ? files : options.files;
        config.debianPackagerOptions = Object.assign({}, config.debianPackagerOptions, options);
        var name = process.env.DEBFULLNAME;
        var email = process.env.DEBEMAIL;
        try {
            packager.create(config);
        } finally {
            if (name !== undefined) {
                process.env.DEBFULLNAME = name;
            } else {
                delete process.env.DEBFULLNAME;
            }
            if (email !== undefined) {
                process.env.DEBEMAIL = email;
            } else {
                delete process.env.DEBEMAIL;
            }
            done();
        }
    });
};
