rm -rf adblockradio-dl
git clone ../adblockradio-dl/

cd client
npm install
npm run build
cd ..

sudo docker build -t abr/buffer-server .
