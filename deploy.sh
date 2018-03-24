scp ../webradio-metadata/*.json dome:/home/alexandre/webradio-metadata/.
scp ../webradio-metadata/*.js dome:/home/alexandre/webradio-metadata/.
scp ../webradio-metadata/parsers/*.js dome:/home/alexandre/webradio-metadata/parsers/.
scp ../adblockradio-dl/*.json dome:/home/alexandre/adblockradio-dl/.
scp ../adblockradio-dl/*.js dome:/home/alexandre/adblockradio-dl/.
scp *.js dome:/home/alexandre/buffer-server/.
scp *.json dome:/home/alexandre/buffer-server/.
cd client/
npm run build
scp -r build dome:/home/alexandre/buffer-server/client/.
