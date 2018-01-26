scp *.js abr00:/home/abr/adblockradio-dl/.
cd client/
npm run build
scp -r build/* abr10:/home/alexandre/site/public/buffer/.
