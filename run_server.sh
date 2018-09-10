#!/bin/bash

WG_WEKAN_URL=http://172.19.0.1:8081 \
WG_WEKAN_USERNAME=andres \
WG_WEKAN_PASSWORD=andres \
WG_GOGS_URL=http://172.19.0.1:10080 \
WG_GOGS_USERNAME=andres \
WG_GOGS_PASSWORD=andres \
WG_URL=http://172.19.0.1:7654 \
WG_CLI=false \
npm start
