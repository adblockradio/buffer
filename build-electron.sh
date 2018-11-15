export npm_config_target=3.0.9
export npm_config_arch=x64
export npm_config_target_arch=x64
export npm_config_disturl=https://atom.io/download/electron
export npm_config_disturl=https://atom.io/download/electron
export npm_config_build_from_source=true

#cd ../adblockradio
cd node_modules/adblockradio
npm rebuild zeromq --runtime=electron --target=3.0.9 --update-binary

#cd ../adblockradio-buffer
cd ../..
HOME=~/.electron-gyp npm install

#ln -s ../adblockradio .

cd client
npm run build

cd ..
#npx electron-packager electron.js --overwrite

npx electron-packager . --overwrite \
	--platform=linux \
	--arch=x64 \
	--icon=resources/app/client/src/img/ab_radio_512.png \
	--ignore=model/ \
	--ignore=doc/ \
	--ignore=config/available.json \
	--ignore=config/radios.json \
	--ignore=config/user.json \
	--ignore=records/ \
	--ignore=index-linux \
	--ignore=index-macos \
	--ignore=index-win.exe \
	--ignore=node_modules/adblockradio/demo \
	--ignore=node_modules/adblockradio/demo-linux \
	--ignore=node_modules/adblockradio/demo-win \
	--ignore=node_modules/adblockradio/demo-macos \
	--ignore=node_modules/adblockradio/post-processing$ \
	--ignore=client/node_modules \
	--ignore=client/src \
	--ignore=client/public \
	--ignore=client/log \
	--ignore=node_modules/\.cache \
	--ignore=node_modules/adblockradio/log/ \
	--ignore=node_modules/adblockradio/model/ \
	--ignore=node_modules/adblockradio/records/ \
	--ignore=node_modules/adblockradio/podcasts/ \
	--ignore=node_modules/adblockradio-buffer-linux-x64/ \
	--ignore=.vscode/ \
	--ignore=error\.log

# TODO missing ignore for log/ (as is, it also ignores abr-log and it's a no-go)