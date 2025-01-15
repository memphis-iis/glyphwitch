#!/bin/bash

cd "$HOME/glyphwitch/glyphwitch"

dos2unix run_meteor

sudo umount .meteor/local -f
rm .meteor/local -rf
mkdir -p .meteor/local

sudo umount packages -f
rm packages -rf
mkdir -p packages

sudo umount node_modules -f
rm node_modules -rf
mkdir -p node_modules

mkdir -p "$HOME/.meteor/local"
sudo mount --bind "$HOME/.meteor/local" .meteor/local

mkdir -p "$HOME/.meteor/packages"
sudo mount --bind "$HOME/.meteor/packages" packages

mkdir -p "$HOME/.meteor/node_modules"
sudo mount --bind "$HOME/.meteor/node_modules" node_modules

#all of the above is to make sure that the meteor packages are mounted correctly
#set permissions for the mounted directories
sudo chown -R $USER:$USER .meteor/local
sudo chown -R $USER:$USER packages
sudo chown -R $USER:$USER node_modules

#meteor update
meteor npm install --save babel-runtime --no-bin-links

