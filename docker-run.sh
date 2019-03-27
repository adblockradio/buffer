sudo docker run -it -p 9820:9820 -a STDOUT \
	--mount type=bind,source="$(pwd)"/config,target=/usr/src/adblockradio-buffer/config \
	--mount type=bind,source="$(pwd)"/log,target=/usr/src/adblockradio-buffer/log \
	adblockradio/buffer
