# Install opencv4nodejs, set enviorment variables to stop autobuild, add opencv include path, library path, and bin path
cd "$HOME/glyphwitch/glyphwitch"

sudo mkdir /unsychronized/
sudo mkdir /unsychronized/node_modules

sudo chmod 777 /unsychronized/node_modules

sudo rm -rf node_modules
sudo ln -s /unsychronized/node_modules node_modules
