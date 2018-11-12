export npm_config_target=3.0.8
export npm_config_arch=x64
export npm_config_target_arch=x64
export npm_config_disturl=https://atom.io/download/electron
export npm_config_disturl=https://atom.io/download/electron
export npm_config_build_from_source=true

cd ../adblockradio
npm rebuild zeromq --runtime=electron --target=3.0.8 --update-binary

cd ../adblockradio-buffer
HOME=~/.electron-gyp npm install