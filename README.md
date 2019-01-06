# LocationProcessor

## Description
Generates Excel Report that includes Milliseconds and Images that are in a distance of given threshold from the points in the path that Drone has taken. Updated Points of Interest file with a list of images for a given threshold. Generates KML files for each Drone path along with the images near the path. For detailed Problem Statement, README.txt can be referred.

## Dependencies
NPM Packages to install using command
```
npm install package.json
```

## Prerequisites
The file MetaData.xlsx should be filled with data for program to run. It has four columns as follows
* **SRT File** - SRT File name which should be present inside **videos** folder which contains the Location details of Drone path at every 100 Milliseconds.
* **SRT Threshold(in meters)** - The distance from the drone path that the images have to be searched with.
* **POI File** - CSV file containing different Points of Interest and their respective Location Details
* **POI Threshold(in meters)** - The distance from the POI points that the images have to be searched with.

## Execution
Use the following command for running after the prerequisites are met.
```
npm start
```

## Result
The Program does the following
* **Path Report** - Report Generation for each SRT file mentioned in MetaData.xlsx into the **reports** folder which includes two columns. The first one is Milliseconds and the second one is the list of images that are within the threshold limit at respective point of time.
* **POI File** - POI file updation for each POI point is updated with list of images that are within the threshold limit.
* **KML File** - KML Generation into **KML** folder for the Path Report which contains Start and End Point of path and the Drone path and the image points that are within the threshold limit.