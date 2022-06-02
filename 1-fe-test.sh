#!/bin/bash

docker build -t test -f fe-dockerfile .
# docker run --rm -it -p 8082:8082 --name test test bash -l
docker run --rm -p 8082:8082 --name test test 