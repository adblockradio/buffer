VERSION=$1

cd client
npm install
npm run build
cd ..

docker build -t adblockradio/buffer:$VERSION .
