#!/bin/bash
# Copyright (c) 2014 Intel Corporation. All rights reserved.
# Use of this source code is governed by an Apache v2 license that can be
# found in the LICENSE-APACHE-V2 file.

# perform a clean build using all functional test scripts;
# this removes the content of the build directory first;
# defaults to x86/beta, or can be invoked with custom arch/channel, e.g.:
# androidSDKDir=/path/to/android/sdk./all.sh <arch> <channel>
# where arch is one of "x86" or "arm" and channel is "stable", "beta"
# or "canary" (NB arm may not be available in all channels)
WD=`dirname $0`
ARCH=$1
CHANNEL=$2
: ${ARCH:=x86}
: ${CHANNEL:=beta}

latest_version=`node get-xwalk-android-latest.js $ARCH $CHANNEL`

export xwalkAndroidDir="$WD/crosswalk-$latest_version-$ARCH/xwalk_app_template"

if [ ! -d $xwalkAndroidDir ] ; then
  $WD/../../bin/xwalk_android_dl --arch $ARCH --channel $CHANNEL -o $WD
  echo '**************************************'
fi

rm -Rf $WD/build/

echo
echo "--------------------- MAKE-APK.TEST.SH"
$WD/make-apk.test.sh --arch $ARCH

echo
echo "--------------------- MAKE-APK-WITH_EXTENSIONS.TEST.SH"
$WD/make-apk-with-extensions.test.sh --arch $ARCH

echo
echo "--------------------- SIMPLE-API-EXAMPLE.JS"
node $WD/simple-api-example.js $androidSDKDir $xwalkAndroidDir $ARCH $WD/demo-app/

echo
echo "--------------------- EMBEDDED-API-EXAMPLE.JS"
node $WD/embedded-api-example.js $androidSDKDir $xwalkAndroidDir $ARCH $WD/demo-app/

echo
echo "--------------------- EXTENSIONS-API-EXAMPLE.JS"
node $WD/extensions-api-example.js $androidSDKDir $xwalkAndroidDir $ARCH

apks=`find $WD/build/ -name *.apk | grep -v signed | grep -v unsigned`

echo
echo '**********************************************************'
echo 'OUTPUT apks:'

for apk in $apks ; do
  echo $apk
done
