#sudo docker volume rm abr-buffer-config
#sudo docker run -it -p 9821:9820 \
#	--mount type=bind,source="$(pwd)"/config,target=/usr/src/adblockradio-buffer/config \
#	--mount type=bind,source="$(pwd)"/log,target=/usr/src/adblockradio-buffer/log \
#	-a STDOUT \
#	abr/buffer-server

#	--net="host" \
sudo docker run -p 9821:9820 -a STDOUT \
	--mount type=bind,source="$(pwd)"/config,target=/usr/src/adblockradio-buffer/config \
	--mount type=bind,source="$(pwd)"/log,target=/usr/src/adblockradio-buffer/log \
	abr/buffer-server
