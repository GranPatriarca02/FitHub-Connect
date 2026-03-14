#!/bin/bash
# Helper script to run the backend using correct JDK 21 version

export JAVA_HOME=/tmp/jdk21
export PATH=$JAVA_HOME/bin:$PATH

./gradlew run
