#!/bin/sh
set -e

if [ "$1" != 'stuff' ]; then
	exec "$@"
fi

cd $TDIR/theia/examples/browser
exec yarn run start /home/project/go/src --hostname=0.0.0.0
