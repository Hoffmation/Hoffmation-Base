# Config
This home automation system is configured using multiple files which are described below.

## Device Config
To highly decrease workload manually entering device data from ioBroker 
you can simply download your whole object tree from within the ioBroker -> objects page.

The resulting `.json` should be placed within `.\server\config\private` folder, renamed to `devices.json`

## Main Config
Please place a `mainConfig.json` in the `.\server\config\private` folder.

The file should contain all the desired services, which definitions can be found within the `iConfig.ts` file.

## RoomConfig
Please use the `.\models\rooms\Raumdefinition.xlsm` excel sheet to
generate a `RoomConfig.txt`. As this needs running a specific node script 
afterwards you should follow the steps within `.\models\rooms\readme.md`

