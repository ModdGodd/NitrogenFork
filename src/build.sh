read -p "Press enter to compile Nitrogen.. "

pyinstaller --windowed --icon="nitrogen.ico" --add-data "index.html:." --name "Nitrogen" main.py

echo "Cleaning up.."

rm -rf build
mv dist/Nitrogen.app .
rm -rf dist
rm -f Nitrogen.spec

read -p "Do you want to zip Nitrogen.app? (y/n): " response
if [[ "$response" =~ ^[Yy]$ ]]; then
    zip -r NitrogenCompressed.zip Nitrogen.app
    rm -rf Nitrogen.app
    mv NitrogenCompressed.zip ../
    echo "Nitrogen.app zipped and original removed."
fi


echo "Compiled Nitrogen successfully!"