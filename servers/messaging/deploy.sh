#!/usr/bin/env bash
chmod +x build.sh
./build.sh
chmod +x provision.sh
docker push andrenguyener/messaging

ssh root@162.243.165.145 'bash -s' < provision.sh


