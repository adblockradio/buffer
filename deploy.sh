scp ../adblockradio-dl/*.json dome:/home/alexandre/adblockradio-dl/.
scp ../adblockradio-dl/*.js dome:/home/alexandre/adblockradio-dl/.
scp *.js dome:/home/alexandre/buffer-server/.
scp *.json dome:/home/alexandre/buffer-server/.
cd client/
npm run build
scp -r build/* dome:/var/www/html/buffer/.
