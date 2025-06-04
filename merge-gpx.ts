const helpText = `
  This script allows you to merge two GPX files when you want them to be one activiy instead of two.
1. Download both activity GPX files
2. Run this script from the terminal with: \`merge-gpx path/to/activity1.gpx path/to/activity2.gpx\`.
`;
// TODO: take an activity ID instead of a file name (and maybe same for route)

import { parseArgs } from "jsr:@std/cli/parse-args";

const searchString = "trkseg";

// If I want to replace Deno down the road, I should just be able to rewrite this class
class TechnicalCode {
  static readFiles(fileNames: string[]) {
    return Promise.all(
      fileNames.map((fileName: string) => Deno.readTextFile(fileName)),
    );
  }

  static writeFile(fileName, activity) {
    return Deno.writeTextFile(fileName, activity);
  }
}

const getTrackSegmentEnd = (activity: string) =>
  activity.lastIndexOf(searchString) + searchString.length + 1;

function getTrackSegment(activity: string) {
  const start = activity.indexOf(searchString) - 1;
  const end = getTrackSegmentEnd(activity);
  return activity.substring(start, end);
}

(async function main() {
  const { _: fileNames, ...parsedArgs } = parseArgs(Deno.args);
  const help = parsedArgs.h || parsedArgs.help;
  if (help) return console.log(helpText);

  const [activity1, activity2] = await TechnicalCode.readFiles(fileNames);
  const trackSegment2 = getTrackSegment(activity2);
  const end1 = getTrackSegmentEnd(activity1);
  const result = [
    activity1.substring(0, end1),
    "\n  ",
    trackSegment2,
    activity1.substring(end1),
  ].join("");
  const directory = fileNames[0].substring(
    0,
    fileNames[0].lastIndexOf("/") + 1,
  );
  const fileName = `${directory}Merged.gpx`;
  console.log("Merged GPX file is ready:", fileName);

  return TechnicalCode.writeFile(fileName, result);
})();
