#!/bin/zsh


[[ -t 0 && -t 1 ]] && INTERACTIVE=true || INTERACTIVE=false
clear

LATEST_VER=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/JadXV/Nitrogen/releases/latest | sed 's|.*/tag/||')
echo "Latest version determined to be: $LATEST_VER\n"

Nitrogen_URL="https://github.com/JadXV/Nitrogen/releases/download/$LATEST_VER/NitrogenCompressed.zip"
TMP_ZIP="/tmp/NitrogenCompressed.zip"

if [ -d "/Applications/Nitrogen.app" ]; then
  echo "Nitrogen is already installed."
  
  if [ "$INTERACTIVE" = true ]; then
    read "choice?Would you like to Update/Reinstall Nitrogen? (y/n): "
    case "$choice" in
      y|Y|yes|Yes ) 
        echo "Removing existing installation..."
        rm -rf /Applications/Nitrogen.app
        ;;
      * ) 
        echo "Installation cancelled."
        exit 0
        ;;
    esac
  else
    echo "Reinstalling Nitrogen automatically"
    rm -rf /Applications/Nitrogen.app
  fi
fi

echo "Downloading Nitrogen"
curl -fsSL "$Nitrogen_URL" -o "$TMP_ZIP" || echo "Failed to download Nitrogen"

echo "Installing Nitrogen"
unzip -q "$TMP_ZIP" -d /tmp || echo "Failed to unzip"
mv /tmp/Nitrogen.app /Applications || echo "Failed to install"
xattr -rd com.apple.quarantine /Applications/Nitrogen.app
rm "$TMP_ZIP"

echo "Nitrogen installed successfully!"
echo "You can now run Nitrogen from your Applications folder."