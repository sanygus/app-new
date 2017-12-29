#!/usr/bin/env bash

set -e

host="$1"
port="$2"
cmd="$3"

echo "wait-for-mongo try connection (15s)..."

status=0;

while [ $status -eq 0 ]
do
  nc -zv $host $port 2>&1 | grep 'open' &> /dev/null
  if [ $? == 0 ]; then
    echo "MongoDB is available"
    status=99
  else
    echo "MongoDB is not available"
  fi
  sleep 15
done

exec $cmd
