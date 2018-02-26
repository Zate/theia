#!/bin/sh
set -e

if [ "$1" != 'stuff' ]; then
	exec "$@"
fi

cd $TDIR
exec yarn theia start /home/project --hostname=0.0.0.0
