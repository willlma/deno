/*
This is for when you accidentally stopped an activity and resumed it later.
1. Download the activity GPX
2. Create a route from the missing chunk and download it (only supports one pause for now)
3. Run this script from the terminal with: `gpx <input.gpx> <route.gpx> <breakMins>`
last arg refers to the number of minutes you think you stopped for before resuming
TODO: support multiple pauses
TODO: take an activity ID instead of a file name (and maybe same for route)
 */
import { parse, stringify } from 'https://deno.land/x/xml/mod.ts';
const { args, readTextFile, writeTextFile } = Deno;

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

async function fillIncompleteGpx(activity, route, breakMins) {
  const [activityText, routeText] = await Promise.all([
    readTextFile(activity),
    readTextFile(route),
  ]);
  const doc = parse(activityText);
  const trkPts = doc.gpx.trk.trkseg.trkpt;
  const pauseIndex = getPauseTrkPtIndex(trkPts);
  const routeTrkPts = parse(routeText).gpx.trk.trkseg.trkpt;
  const breakStart = new Date(trkPts[pauseIndex].time);
  const breakEnd = new Date(breakStart.getTime() + breakMins * 6e4);
  const resumeTime = new Date(trkPts[pauseIndex + 1].time);
  const interval = (resumeTime.getTime() - breakEnd.getTime()) / routeTrkPts.length;
  const newTrkPts = [];
  for (let i = 0; i < routeTrkPts.length; i++) {
    const time = new Date(breakEnd.getTime() + i * interval).toISOString();
    const trkpt = routeTrkPts[i];
    ['@lat', '@lon'].forEach((key) => {
      trkpt[key] = trkpt[key].toFixed(6);
    });

    newTrkPts.push({
      ...trkpt,
      ele: trkpt.ele.toFixed(1),
      time: time.replace(/\.\d+Z$/, 'Z'),
    });
  }
  trkPts.splice(pauseIndex + 1, 0, ...newTrkPts);
  const outputFileName = `${activity.replace('.gpx', '')}_Filled.gpx`;
  return writeTextFile(outputFileName, stringify(doc));
}

await fillIncompleteGpx(...args);
