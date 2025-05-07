#!/bin/zsh

[[ -t 0 && -t 1 ]] && INTERACTIVE=true || INTERACTIVE=false
clear

LATEST_VER=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/ModdGodd/NitrogenFork/releases/latest | sed 's|.*/tag/||')
echo "Latest version determined to be: $LATEST_VER"
echo ""

NitrogenFork_URL="https://github.com/ModdGodd/NitrogenFork/releases/download/$LATEST_VER/NitrogenForkCompressed.zip"
TMP_ZIP="/tmp/NitrogenForkCompressed.zip"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  ARCH_FOLDER="NitrogenFork-ARM64"
elif [[ "$ARCH" == "x86_64" ]]; then
  ARCH_FOLDER="NitrogenFork-x86_64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

if [ -d "/Applications/NitrogenFork.app" ]; then
  echo "NitrogenFork is already installed."
  
  if [ "$INTERACTIVE" = true ]; then
    read "choice?Would you like to Update / Reinstall NitrogenFork? (y/n): "
    case "$choice" in
      y|Y|yes|Yes ) 
        echo "Removing existing installation..."
        rm -rf /Applications/NitrogenFork.app
        ;;
      * ) 
        echo "Installation cancelled."
        exit 0
        ;;
    esac
  else
    echo "Updating / Reinstalling NitrogenFork..."
    rm -rf /Applications/NitrogenFork.app
  fi
fi


if [ -f "$HOME/Documents/NitrogenFork/metadata.json" ]; then
  echo "Deleting metadata.json file..."
  rm "$HOME/Documents/NitrogenFork/metadata.json"
fi

echo "Downloading NitrogenFork"
curl -fsSL "$NitrogenFork_URL" -o "$TMP_ZIP" || echo "Failed to download NitrogenFork"

echo "Installing NitrogenFork"
unzip -q "$TMP_ZIP" -d /tmp || echo "Failed to unzip"

echo "Installing $ARCH_FOLDER"

mv /tmp/$ARCH_FOLDER.app /tmp/NitrogenFork.app || echo "Failed to move the correct version"
mv /tmp/NitrogenFork.app /Applications || echo "Failed to install"
xattr -rd com.apple.quarantine /Applications/NitrogenFork.app

rm "$TMP_ZIP"

echo "NitrogenFork installed successfully!"
echo "You can now open NitrogenFork from your Applications folder."
