const metaDataFile = './MetaData.xlsx';
const imagesFolder = './images/';
const videosFolder = './videos/';
const path = require('path');
const Excel = require('exceljs');
const fs = require('fs');
const parser = require('subtitles-parser');
const exif = require('exif-parser');
const geolib = require('geolib');

locationProcessor = (imageData) => {
    console.log("Processing MetaData Excel");
    // Reading MetaData file for necessary inputs
    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(metaDataFile)
        .then(function () {
            var worksheet = workbook.getWorksheet("Sheet1");
            worksheet.eachRow({
                includeEmpty: true
            }, function (row, rowNumber) {
                // Processing each SRT file except Headers
                if (rowNumber > 1) {
                    console.log("Processing SRT File: " + row.values[1]);
                    var srtFile = row.values[1];
                    var srtThreshold = row.values[2];
                    var poiFile = row.values[3];
                    var poiThreshold = row.values[4];
                    var srt = fs.readFileSync(videosFolder + '' + srtFile, 'utf-8');
                    var data = parser.fromSrt(srt, true);
                    var excelData = [];
                    var pathData = [];
                    var imagePlaceMarkData = [];
                    // Getting the location data at each second and comparing with image data within the threshold limit as given in meta data file
                    data.forEach(element => {
                        if ((element.endTime % 100) == 0) {
                            var images = [];
                            imageData.forEach(imageDataElem => {
                                var distance = geolib.getDistance({
                                    latitude: element.text.split(",")[1],
                                    longitude: element.text.split(",")[0]
                                }, {
                                    latitude: imageDataElem.gps.split(",")[1],
                                    longitude: imageDataElem.gps.split(",")[0]
                                });
                                if (distance <= srtThreshold) {
                                    images.push(imageDataElem.name);
                                    if (newIndexOf(imagePlaceMarkData, "name", imageDataElem.name) == -1) {
                                        imagePlaceMarkData.push(imageDataElem);
                                    }
                                }
                            });
                            // Pushing the data for creation of excel
                            excelData.push({
                                seconds: (element.endTime),
                                images: images.toString()
                            });
                            pathData.push(element.text);
                        }
                    });
                    var fileName = srtFile.replace(".SRT", "");
                    var pathToCreate = "./reports/Report_" + fileName + ".xlsx";
                    var xlsxColumns = [{
                            header: 'Milli Seconds',
                            key: 'seconds',
                            width: 10
                        },
                        {
                            header: 'Images',
                            key: 'images',
                            width: 100
                        }
                    ];
                    // create excel for each SRT file into reports folder
                    createExcel(xlsxColumns, excelData, pathToCreate, "Report")
                        .then(function () {
                            console.log("Report created for " + fileName);
                            // Process POI input given by clients
                            poiProcessor(poiFile, poiThreshold, imageData);
                            // Create KML File
                            generateKMLFile(imagePlaceMarkData, pathData, fileName);
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }
            });
        });
};

// Utilty function for creating Excel File
function createExcel(columns, rows, pathToCreate, sheetName) {

    var workbook = new Excel.Workbook();
    var sheet = workbook.addWorksheet(sheetName);

    sheet.columns = columns;
    for (var i = 0; i < rows.length; i++) {
        sheet.addRow(rows[i]);
    }
    return workbook.xlsx.writeFile(pathToCreate)
        .then(function () {
            return Promise.resolve();
        })
}

poiProcessor = (poiFile, poiThreshold, imageData) => {
    console.log("Processing POI File: " + poiFile);
    var ext = path.extname(poiFile);
    if (ext == ".csv") {
        // Reading POI file
        var csvData = fs.readFileSync(poiFile, 'utf-8').split('\n');
        var workbook = new Excel.Workbook();
        workbook.csv.readFile(poiFile)
            .then(function (worksheet) {
                worksheet.eachRow({
                    includeEmpty: true
                }, function (row, rowNumber) {
                    if (rowNumber > 1) {
                        var images = [];
                        // Getting the location data for each name and comparing with image data within the threshold limit as given in meta data file
                        imageData.forEach(imageDataElem => {
                            var distance = geolib.getDistance({
                                latitude: row.values[3],
                                longitude: row.values[2]
                            }, {
                                latitude: imageDataElem.gps.split(",")[1],
                                longitude: imageDataElem.gps.split(",")[0]
                            });
                            if (distance <= poiThreshold) {
                                images.push(imageDataElem.name);
                            }
                        });
                        csvData[rowNumber - 1] += "\"" + images + "\"";
                        fs.writeFileSync(poiFile, csvData.join('\n'));
                    }
                });
            });
        console.log("POI Data updated for " + poiFile);
    }
};

generateKMLFile = (imagePlaceMarkData, pathData, fileName) => {
    console.log("Generating KML File");
    var XMLHeader = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
    <Document id="feat_1">`;
    var pathXMLHeader = `<Style id="yellowLineGreenPoly">
                            <LineStyle>
                                <color>7f00ffff</color>
                                <width>4</width>
                            </LineStyle>
                            <PolyStyle>
                                <color>7f00ff00</color>
                            </PolyStyle>
                        </Style>
                        <Placemark>
                            <name>Drone Path</name>
                            <description>Based on GPS in SRT File</description>
                            <styleUrl>#yellowLineGreenPoly</styleUrl>
                            <LineString>
                                <extrude>1</extrude>
                                <tessellate>1</tessellate>
                                <altitudeMode>absolute</altitudeMode>
                                <coordinates> `;
    var pathXMLFooter = `</coordinates>
                    </LineString>
                </Placemark>`;
    var XMLFooter = `</Document>
                    </kml>`;
    //Adding all coordinates of the drone path.
    var co_ordinatesData = "";
    pathData.forEach(element => {
        co_ordinatesData += element + '\n';
    });
    //Adding all placemarks of the images near them asper requirement
    var imagePointsXML = "";
    imagePlaceMarkData.forEach((element, index) => {
        imagePointsXML = imagePointsXML + `<Style id="stylesel_${index}">
                                                    <IconStyle id="substyle_${index}">
                                                        <scale>0.4</scale>
                                                        <heading>0</heading>
                                                        <Icon id="link_${index}">
                                                            <href>files/yellow-circle-dot.png</href>
                                                        </Icon>
                                                    </IconStyle>
                                                </Style>
                                                <Placemark id="feat_${index}">
                                                    <description>${element.name}</description>
                                                    <styleUrl>#stylesel_${index}</styleUrl>
                                                    <Point id="geom_${index}">
                                                        <coordinates>${element.gps}</coordinates>
                                                    </Point>
                                                </Placemark>`;
    });
    //Adding place mark for start point of drone path
    imagePointsXML = imagePointsXML + `<Placemark id="feat_${imagePlaceMarkData.length}">
                                            <description>Start Point</description>
                                            <styleUrl>#stylesel_${imagePlaceMarkData.length}</styleUrl>
                                            <Point id="geom_${imagePlaceMarkData.length}">
                                                <coordinates>${pathData[0]}</coordinates>
                                            </Point>
                                        </Placemark>`;
    //Adding place mark for end point of drone path
    imagePointsXML = imagePointsXML + `<Placemark id="feat_${imagePlaceMarkData.length+1}">
                                            <description>End Point</description>
                                            <styleUrl>#stylesel_${imagePlaceMarkData.length+1}</styleUrl>
                                            <Point id="geom_${imagePlaceMarkData.length+1}">
                                                <coordinates>${pathData[pathData.length-1]}</coordinates>
                                            </Point>
                                        </Placemark>`;
    var data = XMLHeader + imagePointsXML + pathXMLHeader + co_ordinatesData + pathXMLFooter + XMLFooter;
    fs.writeFileSync('./KML/KML_' + fileName + '.kml', data);
    console.log("KML file generated for " + fileName);
};

newIndexOf = (array, key, value) => {
    for (let index = 0; index < array.length; index++) {
        if (array[index][key] == value) {
            return index;
        }
    }
    return -1;
}

main = () => {
    console.log("Processing Image Data");
    // Read all Meta Data of all Images
    var imageData = [];
    fs.readdir(imagesFolder, (err, files) => {
        files.forEach(file => {
            var ext = path.extname(file);
            if (ext == '.JPG') {
                const buffer = fs.readFileSync(imagesFolder + '' + file);
                const exif_parser = exif.create(buffer);
                const result = exif_parser.parse();
                var gps = "";
                // storing all the location data for images
                if (result.tags.GPSLatitudeRef && result.tags.GPSLongitudeRef) {
                    gps += result.tags.GPSLongitude + "," + result.tags.GPSLatitude + "," + result.tags.GPSAltitude;
                    imageData.push({
                        name: file,
                        gps: gps
                    });
                }
            }
        });
        locationProcessor(imageData);
    });
}

main();