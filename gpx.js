const helpText = `
This is for when you forgot to record part of activity.
1. Download the activity GPX
2. Create a route from the missing chunk and download it (only supports one pause for now)
3. Run this script from the terminal with: \`gpx activity.gpx route.gpx\`.
--breakMins (-b) or --start (-s) should be passed if it's in the middle or start of the activity
`;
// TODO: take an activity ID instead of a file name (and maybe same for route)

import * as flags from 'https://deno.land/std/flags/mod.ts';
import * as xml from 'https://deno.land/x/xml/mod.ts';

// If I want to replace Deno down the road, I should just be able to rewrite this class
class TechnicalCode {
  static parseArgs() {
    const parsedArgs = flags.parse(Deno.args);
    const help = parsedArgs.h || parsedArgs.help;
    const breakMins = parseInt(parsedArgs.b || parsedArgs.breakMins, 10);
    const isStart = parsedArgs.s || parsedArgs.start;
    const [activity, route] = parsedArgs._;
    return { activity, breakMins, help, isStart, route };
  }

  static readFilesToDocs(fileNames) {
    return Promise.all(fileNames.map((fileName) => Deno.readTextFile(fileName).then(xml.parse)));
  }

  static writeFile(fileName, doc) {
    // Accounting for https://github.com/lowlighter/xml/issues/18 (I need numbers elsewhere so can't use { reviveNumbers: false })
    doc.xml['@version'] = '1.0';
    return Deno.writeTextFile(fileName, xml.stringify(doc));
  }
}

function getDistance(lat, lon, lat2, lon2) {
  // from github copilot
  const R = 6371e3; // metres
  const φ1 = lat * (Math.PI / 180); // φ, λ in radians
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat) * (Math.PI / 180);
  const Δλ = (lon2 - lon) * (Math.PI / 180);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

function getPauseTrkPtIndex(trkPts) {
  let maxDistance = 0;
  let maxIndex = 0;
  for (let i = 0; i < trkPts.length - 2; i++) {
    const trkpt = trkPts[i];
    const trkpt2 = trkPts[i + 1];
    const lat = trkpt['@lat'];
    const lon = trkpt['@lon'];
    const lat2 = trkpt2['@lat'];
    const lon2 = trkpt2['@lon'];
    const distance = getDistance(lat, lon, lat2, lon2);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  return maxIndex;
}

function getRouteTrackPointsWithTimes(routeTrkPts, startTimeMs, interval) {
  const trkPts = [];
  for (let i = 0; i < routeTrkPts.length; i++) {
    const time = new Date(startTimeMs + i * interval).toISOString();
    const trkpt = routeTrkPts[i];
    ['@lat', '@lon'].forEach((key) => {
      trkpt[key] = trkpt[key].toFixed(6);
    });

    trkPts.push({
      ...trkpt,
      ele: trkpt.ele.toFixed(1),
      time: time.replace(/\.\d+Z$/, 'Z'),
    });
  }
  return trkPts;
}

async function fillIncompleteGpx(activity, route, breakMins, isStart) {
  const [activityDoc, routeDoc] = await TechnicalCode.readFilesToDocs([activity, route]);
  const trkPts = activityDoc.gpx.trk.trkseg.trkpt;
  const routeTrkPts = routeDoc.gpx.trk.trkseg.trkpt;
  const breakMs = breakMins * 6e4;
  if (isStart) {
    const interval = breakMs / routeTrkPts.length;
    const startTime = new Date(trkPts[0].time).getTime() - breakMs;
    const newTrkPts = getRouteTrackPointsWithTimes(routeTrkPts, startTime, interval);
    activityDoc.gpx.metadata.time = newTrkPts[0].time;
    activityDoc.gpx.trk.trkseg.trkpt = [...newTrkPts, ...trkPts];
  } else {
    const pauseIndex = getPauseTrkPtIndex(trkPts);
    // console.log('trkPts[pauseIndex]', trkPts[pauseIndex]);
    const breakStart = new Date(trkPts[pauseIndex].time);
    const breakEnd = new Date(breakStart.getTime() + breakMs);
    const resumeTime = new Date(trkPts[pauseIndex + 1].time);
    const interval = (resumeTime.getTime() - breakEnd.getTime()) / routeTrkPts.length;
    const newTrkPts = getRouteTrackPointsWithTimes(routeTrkPts, breakEnd.getTime(), interval);
    // TODO: not clear that this has side effects. Use something like
    // activityDoc.gpx.trk.trkseg.trkpt = [...trkPts.slice(0, pauseIndex), ...newTrkPts, ...trkPts.slice(pauseIndex + 1)]
    trkPts.splice(pauseIndex + 1, 0, ...newTrkPts);
  }

  const outputFileName = `${activity.replace('.gpx', '')}_filled.gpx`;
  return TechnicalCode.writeFile(outputFileName, activityDoc);
}

(function main() {
  const { activity, breakMins, help, isStart, route } = TechnicalCode.parseArgs();
  if (help) return console.log(helpText);

  fillIncompleteGpx(activity, route, breakMins, isStart);
})();
