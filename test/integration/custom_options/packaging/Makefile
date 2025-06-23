all: # nothing to build

install:
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/debian_package.js" "$(DESTDIR)/var/www/tasks/debian_package.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/fileOrDirectory.js" "$(DESTDIR)/var/www/tasks/fileOrDirectory.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/grunt_debian_packager.js" "$(DESTDIR)/var/www/tasks/grunt_debian_packager.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/messages.js" "$(DESTDIR)/var/www/tasks/messages.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/object.assign.polyfill.js" "$(DESTDIR)/var/www/tasks/object.assign.polyfill.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/options.js" "$(DESTDIR)/var/www/tasks/options.js"
	mkdir -p "$(DESTDIR)/var/www/tasks" && cp -a -P "${current_dir}/tasks/replace.js" "$(DESTDIR)/var/www/tasks/replace.js"
	mkdir -p "$(DESTDIR)/var/www" && cp -a -P "${current_dir}/test/integration/custom_options/packaging/debian/changelog" "$(DESTDIR)/var/www/"
	mkdir -p "$(DESTDIR)/var/www" && cp -a -P "${current_dir}/test/integration/custom_options/packaging/debian/control" "$(DESTDIR)/var/www/"

